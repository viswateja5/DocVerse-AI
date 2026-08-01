import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  requiredRole?: string;
}

export function ProtectedRoute({ requiredRole }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    console.log('[Route Guard] Loading auth state...');
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!user) {
    console.warn('[Route Guard] No user found, redirecting to /login from:', location.pathname);
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredRole && user.role !== requiredRole && user.role !== 'admin') {
    console.warn('[Route Guard] Unauthorized role, redirecting to / from:', location.pathname);
    return <Navigate to="/" replace />;
  }

  console.log('[Route Guard] Access granted for:', location.pathname);
  return <Outlet />;
}
