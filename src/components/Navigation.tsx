import { NavLink } from 'react-router-dom';
import { Home, CalendarDays, BookOpen, Users, Target, LogOut } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

const tabs = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/daily', label: 'Daily', icon: CalendarDays },
  { to: '/content', label: 'Content', icon: BookOpen },
  { to: '/network', label: 'Network', icon: Users },
  { to: '/coach', label: 'Coach', icon: Target },
];

export function BottomNav() {
  const { signOut } = useAuth();

  return (
    <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface/95 backdrop-blur-lg border-t border-border safe-bottom">
      <div className="flex items-center justify-around h-16 px-1">
        {tabs.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 px-3 py-1.5 rounded-pill transition-all duration-150 ${
                isActive ? 'text-accent' : 'text-muted'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                <span className="text-[10px] font-medium">{label}</span>
              </>
            )}
          </NavLink>
        ))}
        <button
          type="button"
          onClick={signOut}
          className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-pill transition-all duration-150 text-muted hover:text-text hover:bg-surface-2"
        >
          <LogOut size={20} />
          <span className="text-[10px] font-medium">Logout</span>
        </button>
      </div>
    </nav>
  );
}

export function TopNav() {
  const { signOut } = useAuth();

  return (
    <nav className="hidden sm:flex items-center justify-between gap-1 h-14 border-b border-border bg-surface/80 backdrop-blur-lg sticky top-0 z-40 px-3">
      <div className="flex items-center gap-1">
        {tabs.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-2 px-4 py-2 rounded-pill transition-all duration-150 text-sm font-medium ${
                isActive ? 'bg-accent/15 text-accent' : 'text-muted hover:text-text hover:bg-surface-2'
              }`
            }
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </div>
      <button
        type="button"
        onClick={signOut}
        className="hidden sm:inline-flex items-center gap-2 px-3 py-2 rounded-pill text-sm font-medium text-muted hover:text-text hover:bg-surface-2 transition-all duration-150"
      >
        <LogOut size={16} />
        Logout
      </button>
    </nav>
  );
}
