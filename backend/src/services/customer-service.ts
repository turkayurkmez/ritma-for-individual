import { randomUUID } from 'node:crypto';
import { notFound } from '../domain/errors.js';
import { foldForSearch } from '../domain/search.js';
import type { Customer, CustomerInput } from '../domain/types.js';
import type { CustomerRepository } from '../repositories/types.js';

export class CustomerService {
  constructor(
    private readonly customers: CustomerRepository,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  create(userId: string, input: CustomerInput): Promise<Customer> {
    return this.customers.create({ id: randomUUID(), userId, ...input, deletedAt: null });
  }

  async get(userId: string, id: string): Promise<Customer> {
    const customer = await this.customers.findById(userId, id);
    if (!customer || customer.deletedAt !== null) throw notFound('Müşteri bulunamadı.');
    return customer;
  }

  async search(userId: string, query = ''): Promise<Customer[]> {
    const needle = foldForSearch(query.trim());
    const all = await this.customers.listActive(userId);
    return all
      .filter((c) => foldForSearch(`${c.firstName} ${c.lastName}`).includes(needle))
      .sort((a, b) => a.lastName.localeCompare(b.lastName, 'tr') || a.firstName.localeCompare(b.firstName, 'tr'));
  }

  async update(userId: string, id: string, patch: Partial<CustomerInput>): Promise<Customer> {
    const customer = await this.get(userId, id);
    return this.customers.update({ ...customer, ...patch });
  }

  async softDelete(userId: string, id: string): Promise<void> {
    const customer = await this.get(userId, id);
    await this.customers.update({ ...customer, deletedAt: this.clock().toISOString() });
  }
}
