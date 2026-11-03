import { useRef, useState, type FormEvent } from 'react';
import { FORM_ENDPOINT, sendSignup, validateSignup, type SignupErrors, type SignupValues } from './signup';
import './SignupForm.css';

type Field = keyof SignupValues;
type Status = 'idle' | 'sent' | 'failed';

const FIELDS: Field[] = ['name', 'email', 'job'];
const JOBS = ['Danışman', 'Koç', 'Eğitmen', 'Diyetisyen', 'Diğer'];

export function SignupForm({ endpoint = FORM_ENDPOINT }: { endpoint?: string }) {
  const [values, setValues] = useState<SignupValues>({ name: '', email: '', job: '' });
  const [errors, setErrors] = useState<SignupErrors>({});
  const [status, setStatus] = useState<Status>('idle');
  const [submitting, setSubmitting] = useState(false);
  const fieldRefs = useRef<Partial<Record<Field, HTMLElement | null>>>({});

  const update = (field: Field, value: string) => setValues((current) => ({ ...current, [field]: value }));

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setStatus('idle');
    const trimmed: SignupValues = { name: values.name.trim(), email: values.email.trim(), job: values.job.trim() };
    const found = validateSignup(trimmed);
    setErrors(found);
    const firstInvalid = FIELDS.find((field) => found[field]);
    if (firstInvalid) {
      fieldRefs.current[firstInvalid]?.focus();
      return;
    }
    setSubmitting(true);
    try {
      await sendSignup(trimmed, endpoint);
      setStatus('sent');
    } catch {
      setStatus('failed');
    } finally {
      setSubmitting(false);
    }
  }

  const invalid = (field: Field) => (errors[field] ? 'true' : undefined);

  return (
    <>
      {status !== 'sent' && (
        <form className="signup-form" noValidate onSubmit={handleSubmit}>
          <div>
            <label htmlFor="name">Ad soyad</label>
            <input
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              aria-describedby="name-error"
              aria-invalid={invalid('name')}
              ref={(el) => { fieldRefs.current.name = el; }}
              value={values.name}
              onChange={(e) => update('name', e.target.value)}
            />
            <p className="signup-error" id="name-error" role="alert" hidden={!errors.name}>{errors.name}</p>
          </div>
          <div>
            <label htmlFor="email">E-posta</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              aria-describedby="email-error"
              aria-invalid={invalid('email')}
              ref={(el) => { fieldRefs.current.email = el; }}
              value={values.email}
              onChange={(e) => update('email', e.target.value)}
            />
            <p className="signup-error" id="email-error" role="alert" hidden={!errors.email}>{errors.email}</p>
          </div>
          <div>
            <label htmlFor="job">Mesleğiniz</label>
            <select
              id="job"
              name="job"
              aria-describedby="job-error"
              aria-invalid={invalid('job')}
              ref={(el) => { fieldRefs.current.job = el; }}
              value={values.job}
              onChange={(e) => update('job', e.target.value)}
            >
              <option value="">Seçin…</option>
              {JOBS.map((job) => (
                <option key={job}>{job}</option>
              ))}
            </select>
            <p className="signup-error" id="job-error" role="alert" hidden={!errors.job}>{errors.job}</p>
          </div>
          <div>
            <button className="cta" type="submit" disabled={submitting}>Erken erişim için kaydol</button>
          </div>
          <p className="signup-note">E-postanız yalnızca Ritma duyuruları için kullanılacak.</p>
        </form>
      )}
      <div className={`signup-status${status === 'sent' ? ' ok' : status === 'failed' ? ' fail' : ''}`} aria-live="polite">
        {status === 'sent' && 'Teşekkürler! Listeye eklendin, Ritma hazır olduğunda sana haber vereceğiz.'}
        {status === 'failed' && 'Şu an kayıt alamıyoruz, lütfen daha sonra tekrar deneyin.'}
      </div>
    </>
  );
}
