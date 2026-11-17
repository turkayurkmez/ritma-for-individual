import type { AppointmentDraft } from '../domain/types.js';
import type { AiAssistant, ParseAppointmentInput, SummarizeCustomerHistoryInput } from './ai-assistant.js';
import { addHour, FallbackAiAssistant } from './fallback-ai-assistant.js';

export interface GeminiOptions {
  fetch?: typeof fetch;
  timeoutMs?: number;
  fallback?: AiAssistant;
}

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
}

function isDateStr(v: unknown): v is string {
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
}

function isTimeStr(v: unknown): v is string {
  return typeof v === 'string' && /^\d{2}:\d{2}$/.test(v);
}

export class GeminiAiAssistant implements AiAssistant {
  private readonly fetchFn: typeof fetch;
  private readonly timeoutMs: number;
  private readonly fallback: AiAssistant;

  constructor(
    private readonly apiKey: string,
    private readonly model = 'gemini-2.5-flash',
    options: GeminiOptions = {},
  ) {
    this.fetchFn = options.fetch ?? fetch;
    this.timeoutMs = options.timeoutMs ?? 8000;
    this.fallback = options.fallback ?? new FallbackAiAssistant();
  }

  async parseAppointmentPrompt(input: ParseAppointmentInput): Promise<AppointmentDraft> {
    try {
      const customerListText =
        input.customers.length > 0
          ? input.customers.map((c) => `- id: "${c.id}", ad: "${c.firstName} ${c.lastName}"`).join('\n')
          : '(Kayıtlı müşteri yok)';

      const systemPrompt = [
        'Sen Türkçe çalışan bir randevu asistanısın. Kullanıcının doğal dille yazdığı randevu cümlesini JSON nesnesine dönüştür.',
        `Referans tarih (bugün): ${input.referenceDate}.`,
        'Mevcut aktif müşteriler:',
        customerListText,
        'Kurallar:',
        '1. Cümledeki kişi mevcut müşterilerden biriyle eşleşiyorsa "customerId" alanına o müşterinin id değerini yaz ve "suggestedCustomer" alanını null bırak.',
        '2. Cümledeki kişi mevcut müşterilerde yoksa "customerId" null olsun ve "suggestedCustomer" alanına { "firstName": "...", "lastName": "..." } yaz.',
        '3. "date" alanı YYYY-MM-DD biçiminde olsun (belirtilmemişse referans tarihi kullan).',
        '4. "startTime" ve "endTime" HH:MM (24 saat) biçiminde olsun. Bitiş saati belirtilmemişse başlangıçtan 1 saat sonrası olsun.',
        '5. "note" alanına randevu konusu/notunu kısa Türkçe metin olarak yaz.',
        'Yanıt olarak yalnızca geçerli JSON döndür: {"customerId": string|null, "suggestedCustomer": {"firstName": string, "lastName": string}|null, "date": "YYYY-MM-DD", "startTime": "HH:MM", "endTime": "HH:MM", "note": string}',
      ].join('\n');

      const rawText = await this.generateContent(systemPrompt, input.prompt, true);
      const cleaned = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
      const parsed = JSON.parse(cleaned) as Record<string, unknown>;

      const validCustomerIds = new Set(input.customers.map((c) => c.id));
      const customerId =
        typeof parsed.customerId === 'string' && validCustomerIds.has(parsed.customerId) ? parsed.customerId : null;

      let suggestedCustomer: { firstName: string; lastName: string } | null = null;
      if (
        !customerId &&
        parsed.suggestedCustomer &&
        typeof parsed.suggestedCustomer === 'object' &&
        typeof (parsed.suggestedCustomer as { firstName?: unknown }).firstName === 'string' &&
        typeof (parsed.suggestedCustomer as { lastName?: unknown }).lastName === 'string'
      ) {
        const fn = ((parsed.suggestedCustomer as { firstName: string }).firstName).trim();
        const ln = ((parsed.suggestedCustomer as { lastName: string }).lastName).trim();
        if (fn && ln) suggestedCustomer = { firstName: fn, lastName: ln };
      }

      const date = isDateStr(parsed.date) ? parsed.date : input.referenceDate;
      const startTime = isTimeStr(parsed.startTime) ? parsed.startTime : '09:00';
      const endTime = isTimeStr(parsed.endTime) && parsed.endTime > startTime ? parsed.endTime : addHour(startTime);
      const note = typeof parsed.note === 'string' ? parsed.note.trim() : '';

      return { customerId, suggestedCustomer, date, startTime, endTime, note };
    } catch {
      return this.fallback.parseAppointmentPrompt(input);
    }
  }

  async summarizeCustomerHistory(input: SummarizeCustomerHistoryInput): Promise<string> {
    try {
      const historyLines =
        input.pastAppointments.length > 0
          ? input.pastAppointments.map((a) => `- ${a.date} (${a.status}): ${a.note || 'Not yok'}`).join('\n')
          : 'Geçmiş randevu kaydı yok.';

      const systemPrompt =
        'Sen serbest çalışan bir uzmanın (danışman, diyetisyen, koç) seans öncesi hazırlık asistanısın. Müşterinin geçmiş seans notlarını inceleyip yaklaşan randevu öncesinde uzmana kısa, net ve maddeler halinde Türkçe bir hazırlık özeti (en fazla 3-4 cümle) hazırla.';
      const userPrompt = [
        `Müşteri: ${input.customerName}`,
        `Yaklaşan Randevu: ${input.upcomingAppointment.date} ${input.upcomingAppointment.startTime} - Not: ${input.upcomingAppointment.note || 'Yok'}`,
        'Geçmiş Seanslar:',
        historyLines,
      ].join('\n');

      const text = (await this.generateContent(systemPrompt, userPrompt, false)).trim();
      if (!text) return this.fallback.summarizeCustomerHistory(input);
      return text;
    } catch {
      return this.fallback.summarizeCustomerHistory(input);
    }
  }

  private async generateContent(systemInstruction: string, userText: string, jsonMode: boolean): Promise<string> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(this.model)}:generateContent?key=${encodeURIComponent(this.apiKey)}`;
    const response = await this.fetchFn(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      signal: AbortSignal.timeout(this.timeoutMs),
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemInstruction }] },
        contents: [{ role: 'user', parts: [{ text: userText }] }],
        generationConfig: jsonMode ? { responseMimeType: 'application/json', temperature: 0.1 } : { temperature: 0.3 },
      }),
    });

    if (!response.ok) {
      throw new Error(`Gemini HTTP ${response.status}`);
    }
    const data = (await response.json()) as GeminiResponse;
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (typeof text !== 'string' || !text.trim()) {
      throw new Error('Gemini boş yanıt döndü');
    }
    return text;
  }
}
