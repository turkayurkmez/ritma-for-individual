import { Route, Routes } from 'react-router';

function Landing() {
  return <h1>Ritma</h1>;
}

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
