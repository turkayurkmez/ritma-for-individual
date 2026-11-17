export interface EmailMessage {
  to: string;
  subject: string;
  body: string;
}

export interface EmailSender {
  send(message: EmailMessage): Promise<void>;
}

export class ConsoleEmailSender implements EmailSender {
  async send(message: EmailMessage): Promise<void> {
    console.log(`[Ritma E-posta Bildirimi] Kime: ${message.to} | Konu: ${message.subject}\n${message.body}`);
  }
}
