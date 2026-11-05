import type pg from 'pg';
import type { Customer, Gender } from '../../domain/types.js';
import type { CustomerRepository } from '../types.js';

interface CustomerRow {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  birth_date: string;
  gender: Gender;
  deleted_at: Date | null;
}

const COLUMNS = 'id, user_id, first_name, last_name, birth_date, gender, deleted_at';

function toCustomer(row: CustomerRow): Customer {
  return {
    id: row.id,
    userId: row.user_id,
    firstName: row.first_name,
    lastName: row.last_name,
    birthDate: row.birth_date,
    gender: row.gender,
    deletedAt: row.deleted_at ? row.deleted_at.toISOString() : null,
  };
}

export class PostgresCustomerRepository implements CustomerRepository {
  constructor(private readonly pool: pg.Pool) {}

  async create(customer: Customer): Promise<Customer> {
    await this.pool.query(
      `INSERT INTO customers (${COLUMNS}) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [customer.id, customer.userId, customer.firstName, customer.lastName, customer.birthDate, customer.gender, customer.deletedAt],
    );
    return customer;
  }

  async findById(userId: string, id: string): Promise<Customer | undefined> {
    const { rows } = await this.pool.query<CustomerRow>(
      `SELECT ${COLUMNS} FROM customers WHERE id = $1 AND user_id = $2`,
      [id, userId],
    );
    return rows[0] ? toCustomer(rows[0]) : undefined;
  }

  async listActive(userId: string): Promise<Customer[]> {
    const { rows } = await this.pool.query<CustomerRow>(
      `SELECT ${COLUMNS} FROM customers WHERE user_id = $1 AND deleted_at IS NULL ORDER BY first_name, last_name, id`,
      [userId],
    );
    return rows.map(toCustomer);
  }

  async update(customer: Customer): Promise<Customer> {
    await this.pool.query(
      `UPDATE customers SET first_name = $3, last_name = $4, birth_date = $5, gender = $6, deleted_at = $7
       WHERE id = $1 AND user_id = $2`,
      [customer.id, customer.userId, customer.firstName, customer.lastName, customer.birthDate, customer.gender, customer.deletedAt],
    );
    return customer;
  }
}
