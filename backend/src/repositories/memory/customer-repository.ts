import type { Customer } from '../../domain/types.js';
import type { CustomerRepository } from '../types.js';

export class MemoryCustomerRepository implements CustomerRepository {
  private readonly customers = new Map<string, Customer>();

  async create(customer: Customer): Promise<Customer> {
    this.customers.set(customer.id, customer);
    return customer;
  }

  async findById(userId: string, id: string): Promise<Customer | undefined> {
    const customer = this.customers.get(id);
    return customer?.userId === userId ? customer : undefined;
  }

  async listActive(userId: string): Promise<Customer[]> {
    return [...this.customers.values()].filter((c) => c.userId === userId && c.deletedAt === null);
  }

  async update(customer: Customer): Promise<Customer> {
    this.customers.set(customer.id, customer);
    return customer;
  }
}
