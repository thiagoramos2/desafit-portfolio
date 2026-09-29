import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store';
import Layout from './components/Layout';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Explore from './pages/Explore';
import CreateChallenge from './pages/CreateChallenge';
import ChallengeDetails from './pages/ChallengeDetails';
import MyChallenges from './pages/MyChallenges';
import Profile from './pages/Profile';
import PrivateRoute from './components/PrivateRoute';
import AdminDashboard from './pages/Admin/Dashboard';
import AdminUsers from './pages/Admin/Users';
import AdminChallenges from './pages/Admin/Challenges';
import Wallet from './pages/Wallet';
import AdminWithdrawals from './pages/Admin/Withdrawals';
import AdminLogs from './pages/Admin/Logs';

// Configuração das flags futuras do React Router
import { UNSAFE_NavigationContext } from 'react-router-dom';
import { startTransition } from 'react';

// @ts-ignore
UNSAFE_NavigationContext._currentNavigator = {
  ...UNSAFE_NavigationContext._currentNavigator,
  v7_startTransition: true,
  v7_relativeSplatPath: true
};

function App() {
  console.log('Renderizando App');
  
  return (
    <Provider store={store}>
      <Router>
        <Routes>
          {/* Página Inicial (Landing) */}
          <Route path="/" element={<Landing />} />

          {/* Rotas Públicas */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Rotas Protegidas */}
          <Route path="/" element={<PrivateRoute />}>
            <Route element={<Layout />}>
              <Route path="explore" element={<Explore />} />
              <Route path="my-challenges" element={<MyChallenges />} />
              <Route path="profile" element={<Profile />} />
              <Route path="wallet">
                <Route index element={<Wallet />} />
                <Route path="success" element={<Navigate to="/wallet" />} />
                <Route path="failure" element={<Navigate to="/wallet" />} />
                <Route path="pending" element={<Navigate to="/wallet" />} />
              </Route>
              <Route path="challenges">
                <Route path="new" element={<CreateChallenge />} />
                <Route path=":id" element={<ChallengeDetails />} />
              </Route>
              
              {/* Rotas Administrativas */}
              <Route path="admin">
                <Route index element={<AdminDashboard />} />
                <Route path="users" element={<AdminUsers />} />
                <Route path="challenges" element={<AdminChallenges />} />
                <Route path="withdrawals" element={<AdminWithdrawals />} />
                <Route path="logs" element={<AdminLogs />} />
              </Route>
            </Route>
          </Route>
        </Routes>
      </Router>
    </Provider>
  );
}

export default App;
