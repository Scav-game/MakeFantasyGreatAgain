import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import TeamPage from './pages/TeamPage';

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/team/:teamId" element={<TeamPage />} />
      </Routes>
    </BrowserRouter>
  );
}
