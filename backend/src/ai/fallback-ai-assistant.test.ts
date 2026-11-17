import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FallbackAiAssistant } from './fallback-ai-assistant.js';

const customers = [
  { id: 'c1', firstName: 'Ali', lastName: 'Veli' },
  { id: 'c2', firstName: 'Ayşe', lastName: 'Yılmaz' },
];

test('parses tomorrow, start/end time, existing customer and note', async () => {
  const ai = new FallbackAiAssistant();
  const draft = await ai.parseAppointmentPrompt({
    prompt: 'Yarın 14:00-15:00 Ali Veli kontrol randevusu',
    referenceDate: '2026-11-17',
    customers,
  });
  assert.deepEqual(draft, {
    customerId: 'c1',
    suggestedCustomer: null,
    date: '2026-11-18',
    startTime: '14:00',
    endTime: '15:00',
    note: 'kontrol randevusu',
  });
});

test('extracts suggestedCustomer when customer is not registered and defaults endTime to +1h', async () => {
  const ai = new FallbackAiAssistant();
  const draft = await ai.parseAppointmentPrompt({
    prompt: 'Bugün saat 11 Zeynep Kaya ilk görüşme',
    referenceDate: '2026-11-17',
    customers,
  });
  assert.deepEqual(draft, {
    customerId: null,
    suggestedCustomer: { firstName: 'Zeynep', lastName: 'Kaya' },
    date: '2026-11-17',
    startTime: '11:00',
    endTime: '12:00',
    note: 'ilk görüşme',
  });
});

test('matches existing customer case-insensitively and handles DD.MM.YYYY date', async () => {
  const ai = new FallbackAiAssistant();
  const draft = await ai.parseAppointmentPrompt({
    prompt: '20.11.2026 09.30 ayşe yılmaz beslenme takibi',
    referenceDate: '2026-11-17',
    customers,
  });
  assert.deepEqual(draft, {
    customerId: 'c2',
    suggestedCustomer: null,
    date: '2026-11-20',
    startTime: '09:30',
    endTime: '10:30',
    note: 'beslenme takibi',
  });
});

test('summarizeCustomerHistory formats past appointments and handles empty history', async () => {
  const ai = new FallbackAiAssistant();
  const emptySummary = await ai.summarizeCustomerHistory({
    customerName: 'Ali Veli',
    upcomingAppointment: { date: '2026-11-18', startTime: '14:00', note: 'Kontrol' },
    pastAppointments: [],
  });
  assert.match(emptySummary, /daha önce kayıtlı seans bulunmuyor/i);

  const richSummary = await ai.summarizeCustomerHistory({
    customerName: 'Ali Veli',
    upcomingAppointment: { date: '2026-11-18', startTime: '14:00', note: 'Kontrol' },
    pastAppointments: [
      { date: '2026-11-01', status: 'completed', note: 'İlk ölçüm yapıldı, su tüketimi artırılacak.' },
      { date: '2026-11-10', status: 'completed', note: '1.5 kg kayıp, yürüyüş eklendi.' },
    ],
  });
  assert.match(richSummary, /Ali Veli/);
  assert.match(richSummary, /2026-11-10/);
  assert.match(richSummary, /1\.5 kg kayıp/);
});
