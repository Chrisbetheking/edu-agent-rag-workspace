import { PropsWithChildren, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export function ProtectedRoute({ children }: PropsWithChildren) {
  const { token, hydrate } = useAuthStore();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const savedToken = token || localStorage.getItem('edu_agent_token');
  if (!savedToken) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
