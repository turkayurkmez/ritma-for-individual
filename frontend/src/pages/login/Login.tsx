import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, Navigate } from 'react-router';
import { fetchAuthConfig } from '../../api/auth';
import { useAuth } from '../../auth/AuthProvider';
import { GoogleButton } from '../../auth/GoogleButton';
import './Login.css';

export function Login() {
  const { status, login, loginWithGoogle } = useAuth();
  const [googleClientId, setGoogleClientId] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const inFlight = useRef(false);

  useEffect(() => {
    let active = true;
    fetchAuthConfig().then(
      (config) => {
        if (active) setGoogleClientId(config.googleClientId);
      },
      () => {
        if (active) setGoogleClientId(null);
      },
    );
    return () => {
      active = false;
    };
  }, []);

  if (status === 'authenticated') return <Navigate to="/panel" replace />;
  if (status === 'loading') return <p className="login-loading">Yükleniyor…</p>;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    await run(() => login(email.trim(), password));
  }

  async function run(action: () => Promise<void>) {
    if (inFlight.current) return;
    inFlight.current = true;
    setSubmitting(true);
    setError('');
    try {
      await action();
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
      {googleClientId && (
        <>
          <div className="login-google">
            <GoogleButton clientId={googleClientId} onCredential={(credential) => run(() => loginWithGoogle(credential))} />
          </div>
          <p className="login-divider">veya demo hesapla</p>
        </>
      )}
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
