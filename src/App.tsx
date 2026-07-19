import { HashRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import TeamPage from './pages/TeamPage';

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/team/:teamId" element={<TeamPage />} />
      </Routes>
    </HashRouter>
  );
}
