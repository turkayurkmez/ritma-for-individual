import { Route, Routes } from 'react-router';
import { Landing } from './pages/landing/Landing';

function NotFound() {
  return <p>Sayfa bulunamadı.</p>;
}

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
