import { Route, Routes } from 'react-router';
import { RequireAuth } from './auth/RequireAuth';
import { Landing } from './pages/landing/Landing';
import { Login } from './pages/login/Login';
import { CustomersPage } from './pages/panel/customers/CustomersPage';
import { DailyPage } from './pages/panel/daily/DailyPage';
import { PanelLayout } from './pages/panel/PanelLayout';

function NotFound() {
  return <p>Sayfa bulunamadı.</p>;
}

// Sonraki görevlerde gerçek sayfalarla değişecek.
function Placeholder({ text }: { text: string }) {
  return <p>{text}</p>;
}

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/giris" element={<Login />} />
      <Route path="/panel" element={<RequireAuth />}>
        <Route element={<PanelLayout />}>
          <Route index element={<DailyPage />} />
          <Route path="hafta" element={<Placeholder text="Hafta görünümü yakında." />} />
          <Route path="ay" element={<Placeholder text="Ay görünümü yakında." />} />
          <Route path="musteriler" element={<CustomersPage />} />
        </Route>
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
