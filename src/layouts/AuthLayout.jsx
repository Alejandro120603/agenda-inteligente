import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Card from '../components/Card.jsx';
import Logo from '../components/Logo.jsx';

function AuthLayout() {
  const { user, loading } = useAuth();

  if (loading) {
    return null;
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 to-slate-100 p-4">
      <Card className="w-full max-w-md space-y-6 p-8">
        <div className="flex flex-col items-center space-y-2 text-center">
          <Logo />
          <h1 className="text-2xl font-semibold text-slate-900">Agenda Inteligente</h1>
          <p className="text-sm text-slate-500">
            Organiza tus reuniones y coordina a tu equipo en minutos.
          </p>
        </div>
        <Outlet />
      </Card>
    </div>
  );
}

export default AuthLayout;
