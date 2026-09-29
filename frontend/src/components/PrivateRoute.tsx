import { Navigate, Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../store';

export default function PrivateRoute() {
  console.log('Renderizando PrivateRoute');
  
  const { isAuthenticated, token, user } = useSelector((state: RootState) => state.auth);

  console.log('PrivateRoute - Estado:', { 
    isAuthenticated, 
    hasToken: !!token,
    hasUser: !!user,
    tokenValue: token
  });

  // Verifica se o usuário está autenticado E tem um token válido
  if (!isAuthenticated || !token) {
    console.log('PrivateRoute - Redirecionando para login');
    return <Navigate to="/login" replace />;
  }

  console.log('PrivateRoute - Permitindo acesso');
  return <Outlet />;
} 