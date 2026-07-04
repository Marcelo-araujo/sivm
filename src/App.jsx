import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import MobileInput from './pages/MobileInput';
import Dashboard from './pages/Dashboard';

function App() {
  return (
    <Router>
      {/* Dev Menu temporário para navegação fácil no MVP */}
      <nav style={{ padding: '1rem', background: 'var(--bg-card)', borderBottom: '1px solid var(--border-light)', display: 'flex', gap: '1rem' }}>
        <Link to="/" style={{ color: 'var(--accent-blue)', textDecoration: 'none', fontWeight: 500 }}>📱 Input do Técnico</Link>
        <Link to="/dashboard" style={{ color: 'var(--accent-blue)', textDecoration: 'none', fontWeight: 500 }}>📊 Dashboard Gerencial</Link>
      </nav>

      <Routes>
        <Route path="/" element={<MobileInput />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </Router>
  );
}

export default App;
