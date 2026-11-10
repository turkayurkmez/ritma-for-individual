import type { Appointment, Customer, User } from '../domain/types.js';

export interface CustomerRepository {
  create(customer: Customer): Promise<Customer>;
  /** Silinmiş müşterileri de döndürür (randevudaki ad için). */
  findById(userId: string, id: string): Promise<Customer | undefined>;
  listActive(userId: string): Promise<Customer[]>;
  update(customer: Customer): Promise<Customer>;
}

export interface AppointmentRepository {
  findById(userId: string, id: string): Promise<Appointment | undefined>;
  /** İki ucu dahil; tarih, sonra başlangıç saatine göre sıralı. */
  listByDateRange(userId: string, from: string, to: string): Promise<Appointment[]>;
  /**
   * Ekler ya da (id'ye göre) günceller. İptal edilmemiş bir randevu, aynı kullanıcının
   * aynı günündeki başka bir aktif randevuyla kesişirse hiçbir şey yazmadan `undefined` döner.
   */
  saveIfNoConflict(appointment: Appointment): Promise<Appointment | undefined>;
  delete(userId: string, id: string): Promise<boolean>;
}

export interface Session {
  token: string;
  userId: string;
  createdAt: string;
}

export interface SessionStore {
  create(userId: string): Promise<Session>;
  find(token: string): Promise<Session | undefined>;
  delete(token: string): Promise<void>;
}

export interface UserRepository {
  findById(id: string): Promise<User | undefined>;
  /** Aynı googleSub varsa o kullanıcıyı döndürür (e-posta/ad güncellenmez); yoksa yeni kullanıcı açar.
   *  E-posta (büyük/küçük harf fark etmez) başka bir kullanıcıda varsa hiçbir şey yazmadan `undefined` döner. */
  findOrCreateByGoogle(input: { googleSub: string; email: string; displayName: string }): Promise<User | undefined>;
}
