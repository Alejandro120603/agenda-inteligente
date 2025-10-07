import { NavLink } from 'react-router-dom';
import { CalendarRange, Users, UserCircle, LayoutDashboard } from 'lucide-react';
import clsx from 'clsx';
import Logo from './Logo.jsx';

const links = [
  { to: '/', label: 'Panel', icon: LayoutDashboard },
  { to: '/meetings', label: 'Reuniones', icon: CalendarRange },
  { to: '/teams', label: 'Equipos', icon: Users },
  { to: '/profile', label: 'Perfil', icon: UserCircle }
];

function Sidebar() {
  return (
    <aside className="hidden w-64 flex-col border-r border-slate-200 bg-white p-6 shadow-sm lg:flex">
      <div className="mb-10 flex items-center gap-2">
        <Logo />
        <span className="text-lg font-semibold text-slate-900">Agenda Inteligente</span>
      </div>
      <nav className="flex flex-1 flex-col gap-2">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition',
                isActive ? 'bg-brand-100 text-brand-700 shadow-inner' : 'text-slate-600 hover:bg-slate-100'
              )
            }
          >
            <Icon className="h-5 w-5" />
            {label}
          </NavLink>
        ))}
      </nav>
      <p className="mt-8 text-xs text-slate-400">© {new Date().getFullYear()} Agenda Inteligente</p>
    </aside>
  );
}

export default Sidebar;
