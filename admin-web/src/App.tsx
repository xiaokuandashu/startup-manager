import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState } from 'react';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import PlansPage from './pages/PlansPage';
import OrdersPage from './pages/OrdersPage';
import CodesPage from './pages/CodesPage';
import UpdatesPage from './pages/UpdatesPage';
import QQGroupsPage from './pages/QQGroupsPage';
import AgreementsPage from './pages/AgreementsPage';
import Layout from './components/Layout';

function App() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('admin_token'));
  const [username, setUsername] = useState(() => localStorage.getItem('admin_user') || '');

  const handleLogin = (t: string, u: string) => {
    setToken(t);
    setUsername(u);
    localStorage.setItem('admin_token', t);
    localStorage.setItem('admin_user', u);
  };

  const handleLogout = () => {
    setToken(null);
    setUsername('');
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
  };

  if (!token) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <BrowserRouter>
      <Layout username={username} onLogout={handleLogout}>
        <Routes>
          <Route path="/" element={<DashboardPage token={token} />} />
          <Route path="/plans" element={<PlansPage token={token} />} />
          <Route path="/orders" element={<OrdersPage token={token} />} />
          <Route path="/codes" element={<CodesPage token={token} />} />
          <Route path="/updates" element={<UpdatesPage token={token} />} />
          <Route path="/qq-groups" element={<QQGroupsPage token={token} />} />
          <Route path="/agreements" element={<AgreementsPage token={token} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
