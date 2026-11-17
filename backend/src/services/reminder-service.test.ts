import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FallbackAiAssistant } from '../ai/fallback-ai-assistant.js';
import { DEMO_USERS } from '../auth/demo-identity-provider.js';
import { MemoryAppointmentRepository } from '../repositories/memory/appointment-repository.js';
import { MemoryCustomerRepository } from '../repositories/memory/customer-repository.js';
import { MemoryReminderNotificationRepository } from '../repositories/memory/reminder-notification-repository.js';
import { MemoryUserRepository } from '../repositories/memory/user-repository.js';
import { AppointmentService } from './appointment-service.js';
import { CustomerService } from './customer-service.js';
import type { EmailMessage, EmailSender } from './email-sender.js';
import { ReminderService } from './reminder-service.js';

function setup(now = new Date(2026, 10, 17, 13, 40, 0)) {
  const users = new MemoryUserRepository(DEMO_USERS);
  const appointments = new MemoryAppointmentRepository();
  const customers = new MemoryCustomerRepository();
  const notifications = new MemoryReminderNotificationRepository();
  const sentEmails: EmailMessage[] = [];
  const emailSender: EmailSender = {
    send: async (msg) => {
      sentEmails.push(msg);
    },
  };
  let currentNow = now;
  const service = new ReminderService(
    users,
    appointments,
    customers,
    notifications,
    new FallbackAiAssistant(),
    emailSender,
    () => currentNow,
  );
  const customerService = new CustomerService(customers);
  const appointmentService = new AppointmentService(appointments, customers);

  return {
    service,
    customerService,
    appointmentService,
    sentEmails,
    setNow: (next: Date) => {
      currentNow = next;
    },
  };
}

test('sends a reminder email with AI summary for an appointment within the reminder window and does not duplicate', async () => {
  const { service, customerService, appointmentService, sentEmails } = setup(new Date(2026, 10, 17, 13, 40, 0));
  const userId = 'demo-user-ayse';
  const customer = await customerService.create(userId, {
    firstName: 'Ali',
    lastName: 'Veli',
    birthDate: '1990-01-01',
    gender: 'male',
  });

  await appointmentService.create(userId, {
    customerId: customer.id,
    date: '2026-11-10',
    startTime: '10:00',
    endTime: '11:00',
    status: 'completed',
    note: 'İlk seans: günlük 2 litre su hedefi kondu.',
  });

  await appointmentService.create(userId, {
    customerId: customer.id,
    date: '2026-11-17',
    startTime: '14:00',
    endTime: '15:00',
    status: 'scheduled',
    note: '2. hafta kontrolü',
  });

  const firstCheck = await service.checkUserReminders(userId);
  assert.equal(firstCheck.sentCount, 1);
  assert.equal(sentEmails.length, 1);
  assert.equal(sentEmails[0]?.to, 'ayse@ritma.demo');
  assert.match(sentEmails[0]!.subject, /Ali Veli/);
  assert.match(sentEmails[0]!.body, /günlük 2 litre su hedefi kondu/);

  const secondCheck = await service.checkUserReminders(userId);
  assert.equal(secondCheck.sentCount, 0);
  assert.equal(sentEmails.length, 1);
});

test('rescheduling an appointment resets reminderSentAt so a new reminder is sent in the new window', async () => {
  const { service, customerService, appointmentService, setNow } = setup(new Date(2026, 10, 17, 13, 40, 0));
  const userId = 'demo-user-ayse';
  const customer = await customerService.create(userId, {
    firstName: 'Zeynep',
    lastName: 'Kaya',
    birthDate: '1992-03-15',
    gender: 'female',
  });

  const appt = await appointmentService.create(userId, {
    customerId: customer.id,
    date: '2026-11-17',
    startTime: '14:00',
    endTime: '15:00',
    status: 'scheduled',
    note: 'Görüşme',
  });

  assert.equal((await service.checkUserReminders(userId)).sentCount, 1);

  await appointmentService.update(userId, appt.id, { startTime: '16:00', endTime: '17:00' });
  setNow(new Date(2026, 10, 17, 15, 45, 0));

  const afterReschedule = await service.checkUserReminders(userId);
  assert.equal(afterReschedule.sentCount, 1);
  assert.equal((await service.listSent(userId)).length, 2);
});

test('does not send reminders when disabled, cancelled, completed, or outside the time window', async () => {
  const { service, customerService, appointmentService } = setup(new Date(2026, 10, 17, 13, 40, 0));
  const userId = 'demo-user-ayse';
  const customer = await customerService.create(userId, {
    firstName: 'Can',
    lastName: 'Yılmaz',
    birthDate: '1988-07-20',
    gender: 'male',
  });

  await appointmentService.create(userId, {
    customerId: customer.id,
    date: '2026-11-17',
    startTime: '14:00',
    endTime: '15:00',
    status: 'cancelled',
    note: 'İptal',
  });
  await appointmentService.create(userId, {
    customerId: customer.id,
    date: '2026-11-17',
    startTime: '18:00',
    endTime: '19:00',
    status: 'scheduled',
    note: 'Akşam seansı',
  });

  assert.equal((await service.checkUserReminders(userId)).sentCount, 0);

  await service.updateSettings(userId, null);
  await appointmentService.create(userId, {
    customerId: customer.id,
    date: '2026-11-17',
    startTime: '13:55',
    endTime: '14:55',
    status: 'scheduled',
    note: 'Yakın seans',
  });
  assert.equal((await service.checkUserReminders(userId)).sentCount, 0);
});
