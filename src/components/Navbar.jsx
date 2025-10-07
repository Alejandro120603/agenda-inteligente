import { Menu } from 'lucide-react';
import Button from './Button.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import Logo from './Logo.jsx';

function Navbar() {
  const { user, logout } = useAuth();

  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4 shadow-sm">
      <div className="flex items-center gap-3">
        <Button variant="ghost" className="rounded-full p-2 lg:hidden">
          <Menu className="h-5 w-5" />
        </Button>
        <Logo className="hidden lg:flex" />
      </div>
      <div className="flex items-center gap-4">
        <div className="flex flex-col text-right">
          <span className="text-sm font-medium text-slate-900">{user?.name}</span>
          <span className="text-xs text-slate-500">{user?.email}</span>
        </div>
        <Button variant="secondary" onClick={logout}>
          Cerrar sesión
        </Button>
      </div>
    </header>
  );
}

export default Navbar;
