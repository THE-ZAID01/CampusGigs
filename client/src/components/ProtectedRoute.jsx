import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { getToken } from '../api/axios.js';
import Spinner from './Spinner.jsx';

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <Spinner full />;
  if (!user || !getToken()) return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  return children;
}

export function GuestRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner full />;
  if (user && getToken()) return <Navigate to="/dashboard" replace />;
  return children;
}
