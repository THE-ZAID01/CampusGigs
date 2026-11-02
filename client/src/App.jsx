import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute, { GuestRoute } from './components/ProtectedRoute.jsx';
import AppShell from './components/AppShell.jsx';
import Login from './pages/Login.jsx';
import Signup from './pages/Signup.jsx';
import { ForgotPassword, ResetPassword } from './pages/Recover.jsx';
import Dashboard from './pages/Dashboard.jsx';
import GigDetail from './pages/GigDetail.jsx';
import Profile from './pages/Profile.jsx';
import PublicProfile from './pages/PublicProfile.jsx';
import Wallet from './pages/Wallet.jsx';
import History from './pages/History.jsx';

function NotFound() {
  return (
    <div className="page"><div className="empty"><h2>This page doesn't exist</h2>
      <a className="btn btn-primary" href="/dashboard">Back to dashboard</a></div></div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
      <Route path="/signup" element={<GuestRoute><Signup /></GuestRoute>} />
      <Route path="/forgot-password" element={<GuestRoute><ForgotPassword /></GuestRoute>} />
      <Route path="/reset-password" element={<GuestRoute><ResetPassword /></GuestRoute>} />

      <Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/gigs/:id" element={<GigDetail />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/u/:id" element={<PublicProfile />} />
        <Route path="/wallet" element={<Wallet />} />
        <Route path="/history" element={<History />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
