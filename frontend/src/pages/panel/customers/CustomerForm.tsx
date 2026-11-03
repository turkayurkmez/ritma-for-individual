import { useRef, useState, type FormEvent } from 'react';
import { createCustomer, updateCustomer } from '../../../api/customers';
import type { Customer, CustomerInput, Gender } from '../../../api/types';
import { Modal } from '../../../components/Modal';
import { genderLabel, GENDERS } from '../../../lib/labels';
import './CustomerForm.css';

interface CustomerFormProps {
  customer?: Customer;
  onSaved: () => void;
  onCancel: () => void;
}

export function CustomerForm({ customer, onSaved, onCancel }: CustomerFormProps) {
  const [firstName, setFirstName] = useState(customer?.firstName ?? '');
  const [lastName, setLastName] = useState(customer?.lastName ?? '');
  const [birthDate, setBirthDate] = useState(customer?.birthDate ?? '');
  const [gender, setGender] = useState<Gender>(customer?.gender ?? 'undisclosed');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const inFlight = useRef(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (inFlight.current) return;
    inFlight.current = true;
    setSubmitting(true);
    setError('');
    const input: CustomerInput = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      birthDate,
      gender,
    };
    try {
      if (customer) await updateCustomer(customer.id, input);
      else await createCustomer(input);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Bir sorun oluştu.');
      setSubmitting(false);
    } finally {
      inFlight.current = false;
    }
  }

  return (
    <Modal title={customer ? 'Müşteriyi düzenle' : 'Müşteri ekle'} onClose={onCancel}>
      <form className="customer-form" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="customer-first-name">Ad</label>
          <input id="customer-first-name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
        </div>
        <div>
          <label htmlFor="customer-last-name">Soyad</label>
          <input id="customer-last-name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
        </div>
        <div>
          <label htmlFor="customer-birth-date">Doğum tarihi</label>
          <input
            id="customer-birth-date"
            type="date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="customer-gender">Cinsiyet</label>
          <select id="customer-gender" value={gender} onChange={(e) => setGender(e.target.value as Gender)}>
            {GENDERS.map((g) => (
              <option key={g} value={g}>{genderLabel(g)}</option>
            ))}
          </select>
        </div>
        <p className="customer-form-error" role="alert" hidden={!error}>{error}</p>
        <div className="modal-actions">
          <button type="button" className="modal-button" onClick={onCancel}>Vazgeç</button>
          <button type="submit" className="modal-button modal-button-primary" disabled={submitting}>Kaydet</button>
        </div>
      </form>
    </Modal>
  );
}
