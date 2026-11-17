import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GeminiAiAssistant } from './gemini-ai-assistant.js';

const customers = [{ id: 'c1', firstName: 'Ali', lastName: 'Veli' }];

test('calls the configured Gemini model and parses structured JSON response', async () => {
  let calledUrl = '';
  const fakeFetch: typeof fetch = async (input) => {
    calledUrl = String(input);
    return new Response(
      JSON.stringify({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    customerId: 'c1',
                    suggestedCustomer: null,
                    date: '2026-11-18',
                    startTime: '14:00',
                    endTime: '15:00',
                    note: 'Kontrol seansı',
                  }),
                },
              ],
            },
          },
        ],
      }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    );
  };

  const ai = new GeminiAiAssistant('secret-key', 'gemini-2.5-pro', { fetch: fakeFetch });
  const draft = await ai.parseAppointmentPrompt({
    prompt: 'Yarın 14:00 Ali Veli kontrol seansı',
    referenceDate: '2026-11-17',
    customers,
  });

  assert.match(calledUrl, /models\/gemini-2\.5-pro:generateContent\?key=secret-key/);
  assert.deepEqual(draft, {
    customerId: 'c1',
    suggestedCustomer: null,
    date: '2026-11-18',
    startTime: '14:00',
    endTime: '15:00',
    note: 'Kontrol seansı',
  });
});

test('falls back to FallbackAiAssistant when Gemini returns 500 or invalid JSON', async () => {
  const failingFetch: typeof fetch = async () => new Response('Internal Error', { status: 500 });
  const ai = new GeminiAiAssistant('secret-key', 'gemini-2.5-flash', { fetch: failingFetch });

  const draft = await ai.parseAppointmentPrompt({
    prompt: 'Yarın 14:00-15:00 Ali Veli kontrol randevusu',
    referenceDate: '2026-11-17',
    customers,
  });
  assert.equal(draft.customerId, 'c1');
  assert.equal(draft.date, '2026-11-18');
  assert.equal(draft.startTime, '14:00');
});

test('summarizeCustomerHistory returns Gemini text or falls back on error', async () => {
  const okFetch: typeof fetch = async () =>
    new Response(
      JSON.stringify({
        candidates: [{ content: { parts: [{ text: 'AI tarafından üretilen seans özeti.' }] } }],
      }),
      { status: 200 },
    );
  const ai = new GeminiAiAssistant('secret-key', 'gemini-2.5-flash', { fetch: okFetch });
  const text = await ai.summarizeCustomerHistory({
    customerName: 'Ali Veli',
    upcomingAppointment: { date: '2026-11-18', startTime: '14:00', note: 'Kontrol' },
    pastAppointments: [{ date: '2026-11-01', status: 'completed', note: 'İlk görüşme' }],
  });
  assert.equal(text, 'AI tarafından üretilen seans özeti.');
});
