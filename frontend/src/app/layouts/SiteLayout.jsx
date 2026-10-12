import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { CalendarCheck, Home, Pill, ShoppingCart, Stethoscope, User, LogIn, LogOut, LayoutDashboard, HeartPulse } from 'lucide-react';
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { post } from '../../lib/api.js';
import { disconnectSocket } from '../../lib/socket.js';
import { useAuth, homeFor } from '../../lib/authStore.js';
import { useCart } from '../../features/cart/cartStore.js';
import { Button } from '../../components/ui/Button.jsx';
import { Avatar } from '../../components/ui/Card.jsx';
import { NotificationBell } from '../NotificationBell.jsx';
import { getLenis } from '../../lib/lenis.js';
import { cn } from '../../lib/cn.js';

const NAV = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/doctors', label: 'Doctors', icon: Stethoscope },
  { to: '/pharmacy', label: 'Pharmacy', icon: Pill },
  { to: '/appointments', label: 'Visits', icon: CalendarCheck, auth: true },
  { to: '/profile', label: 'Profile', icon: User, auth: true },
];

export function Logo({ className }) {
  return (
    <Link to="/" className={cn('flex items-center gap-2 font-display text-xl font-extrabold text-brand-700', className)}>
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-600 text-white"><HeartPulse className="h-5 w-5" /></span>
      CarePulse
    </Link>
  );
}

function CartButton() {
  const count = useCart((s) => s.items.reduce((n, i) => n + i.qty, 0));
  return (
    <Link to="/cart" aria-label={`Cart, ${count} items`} className="relative rounded-xl p-2 text-ink-600 hover:bg-ink-100">
      <ShoppingCart className="h-5 w-5" />
      {count > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] font-bold text-white">{count}</span>}
    </Link>
  );
}

export function SiteLayout() {
  const { user, status } = useAuth();
  const { pathname } = useLocation();
  const nav = useNavigate();
  const qc = useQueryClient();
  const clear = useAuth((s) => s.clear);
  const authed = status === 'authed';

  useEffect(() => {
    getLenis()?.scrollTo(0, { immediate: true });
    window.scrollTo(0, 0);
  }, [pathname]);

  const logout = async () => {
    await post('/auth/logout').catch(() => {});
    disconnectSocket();
    clear();
    qc.clear();
    nav('/login');
  };

  const items = NAV.filter((n) => !n.auth || authed);
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-ink-100 bg-white/85 backdrop-blur-lg">
        <div className="container flex h-16 items-center justify-between gap-3">
          <Logo />
          <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
            {items.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => cn('rounded-xl px-3.5 py-2 text-sm font-semibold transition', isActive ? 'bg-brand-50 text-brand-700' : 'text-ink-600 hover:bg-ink-100')}>
                {n.label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-1">
            <CartButton />
            {authed ? (
              <>
                <NotificationBell />
                {user.role !== 'patient' ? (
                  <Button to={homeFor(user.role)} size="sm" variant="soft"><LayoutDashboard className="h-4 w-4" /> Workspace</Button>
                ) : (
                  <button onClick={() => nav('/profile')} aria-label="Profile" className="ml-1"><Avatar name={user.name} src={user.avatar} size={36} /></button>
                )}
                <button onClick={logout} aria-label="Logout" title="Logout" className="rounded-xl p-2 text-ink-600 hover:bg-ink-100"><LogOut className="h-5 w-5" /></button>
              </>
            ) : (
              <Button to="/login" size="sm"><LogIn className="h-4 w-4" /> Login</Button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 pb-24 md:pb-10"><Outlet /></main>

      <footer className="hidden border-t border-ink-100 bg-white py-8 md:block">
        <div className="container flex flex-wrap items-center justify-between gap-4 text-sm text-ink-500">
          <Logo />
          <p>© {new Date().getFullYear()} CarePulse Hospital. For emergencies call your local emergency number.</p>
        </div>
      </footer>

      {/* mobile bottom navigation */}
      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-ink-100 bg-white/95 backdrop-blur md:hidden" aria-label="Primary">
        <ul className="grid" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
          {items.map((n) => (
            <li key={n.to}>
              <NavLink to={n.to} end={n.end} className={({ isActive }) => cn('flex flex-col items-center gap-0.5 py-2 text-[11px] font-semibold', isActive ? 'text-brand-700' : 'text-ink-500')}>
                <n.icon className="h-5 w-5" />
                {n.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
