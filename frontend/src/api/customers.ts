import { request } from './client';
import type { Customer, CustomerInput } from './types';

export async function listCustomers(search?: string): Promise<Customer[]> {
  const query = search ? `?search=${encodeURIComponent(search)}` : '';
  const result = await request<{ customers: Customer[] }>(`/customers${query}`);
  return result.customers;
}

export async function createCustomer(input: CustomerInput): Promise<Customer> {
  const result = await request<{ customer: Customer }>('/customers', { method: 'POST', body: input });
  return result.customer;
}

export async function updateCustomer(id: string, patch: Partial<CustomerInput>): Promise<Customer> {
  const result = await request<{ customer: Customer }>(`/customers/${id}`, { method: 'PATCH', body: patch });
  return result.customer;
}

export async function deleteCustomer(id: string): Promise<void> {
  await request<void>(`/customers/${id}`, { method: 'DELETE' });
}
