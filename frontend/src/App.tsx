import { Route, Routes } from 'react-router';
import { RequireAuth } from './auth/RequireAuth';
import { Landing } from './pages/landing/Landing';
import { Login } from './pages/login/Login';
import { CustomersPage } from './pages/panel/customers/CustomersPage';
import { DailyPage } from './pages/panel/daily/DailyPage';
import { MonthlyPage } from './pages/panel/monthly/MonthlyPage';
import { PanelLayout } from './pages/panel/PanelLayout';
import { WeeklyPage } from './pages/panel/weekly/WeeklyPage';

function NotFound() {
  return <p>Sayfa bulunamadı.</p>;
}

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/giris" element={<Login />} />
      <Route path="/panel" element={<RequireAuth />}>
        <Route element={<PanelLayout />}>
          <Route index element={<DailyPage />} />
          <Route path="hafta" element={<WeeklyPage />} />
          <Route path="ay" element={<MonthlyPage />} />
          <Route path="musteriler" element={<CustomersPage />} />
        </Route>
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
