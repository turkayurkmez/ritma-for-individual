import { useState } from 'react';
import { deleteCustomer, listCustomers } from '../../../api/customers';
import type { Customer } from '../../../api/types';
import { ConfirmDialog } from '../../../components/ConfirmDialog';
import { genderLabel } from '../../../lib/labels';
import { useApi } from '../../../lib/useApi';
import { useDebouncedValue } from '../../../lib/useDebouncedValue';
import { CustomerForm } from './CustomerForm';
import './CustomersPage.css';

type Dialog = { kind: 'form'; customer?: Customer } | { kind: 'delete'; customer: Customer } | null;

export function CustomersPage() {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search.trim(), 300);
  const { data, loading, error, reload } = useApi(() => listCustomers(debouncedSearch), [debouncedSearch]);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [actionError, setActionError] = useState('');

  function closeDialog() {
    setDialog(null);
  }

  function handleSaved() {
    setDialog(null);
    reload();
  }

  async function handleDelete(customer: Customer) {
    setDialog(null);
    setActionError('');
    try {
      await deleteCustomer(customer.id);
      reload();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Bir sorun oluştu.');
    }
  }

  return (
    <section className="customers">
      <div className="customers-toolbar">
        <div className="customers-search">
          <label htmlFor="customers-search">Müşteri ara</label>
          <input
            id="customers-search"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button type="button" className="cta" onClick={() => setDialog({ kind: 'form' })}>Müşteri ekle</button>
      </div>

      {actionError && <p className="customers-error" role="alert">{actionError}</p>}

      {error ? (
        <div className="customers-error" role="alert">
          <p>{error.message}</p>
          <button type="button" className="customers-retry" onClick={reload}>Yeniden dene</button>
        </div>
      ) : !data && loading ? (
        <p>Yükleniyor…</p>
      ) : data && data.length === 0 ? (
        <p>{debouncedSearch ? 'Aramaya uyan müşteri yok.' : 'Henüz müşteri yok.'}</p>
      ) : (
        <ul className="customers-list">
          {data?.map((customer) => {
            const fullName = `${customer.firstName} ${customer.lastName}`;
            return (
              <li key={customer.id} className="customers-item">
                <div className="customers-info">
                  <span className="customers-name">{fullName}</span>
                  <span className="customers-meta">{genderLabel(customer.gender)}</span>
                </div>
                <div className="customers-actions">
                  <button
                    type="button"
                    className="customers-action"
                    aria-label={`${fullName} düzenle`}
                    onClick={() => setDialog({ kind: 'form', customer })}
                  >
                    Düzenle
                  </button>
                  <button
                    type="button"
                    className="customers-action customers-action-danger"
                    aria-label={`${fullName} sil`}
                    onClick={() => setDialog({ kind: 'delete', customer })}
                  >
                    Sil
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {dialog?.kind === 'form' && (
        <CustomerForm customer={dialog.customer} onSaved={handleSaved} onCancel={closeDialog} />
      )}
      {dialog?.kind === 'delete' && (
        <ConfirmDialog
          message={`${dialog.customer.firstName} ${dialog.customer.lastName} silinsin mi?`}
          confirmLabel="Sil"
          onConfirm={() => handleDelete(dialog.customer)}
          onCancel={closeDialog}
        />
      )}
    </section>
  );
}
