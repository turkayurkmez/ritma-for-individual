import { useRef, useState, type FormEvent } from 'react';
import { Link, Navigate } from 'react-router';
import { useAuth } from '../../auth/AuthProvider';
import './Login.css';

export function Login() {
  const { status, login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const inFlight = useRef(false);

  if (status === 'authenticated') return <Navigate to="/panel" replace />;
  if (status === 'loading') return <p className="login-loading">Yükleniyor…</p>;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (inFlight.current) return;
    inFlight.current = true;
    setSubmitting(true);
    setError('');
    try {
      await login(email.trim(), password);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Bir sorun oluştu.');
      setSubmitting(false);
    } finally {
      inFlight.current = false;
    }
  }

  return (
    <main className="login">
      <h1>Giriş</h1>
      <form className="login-form" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="login-email">E-posta</label>
          <input
            id="login-email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="login-password">Parola</label>
          <input
            id="login-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <p className="login-error" role="alert" hidden={!error}>{error}</p>
        <button className="cta" type="submit" disabled={submitting}>Giriş yap</button>
      </form>
      <p className="login-back"><Link to="/">← Tanıtım sayfasına dön</Link></p>
    </main>
  );
}
