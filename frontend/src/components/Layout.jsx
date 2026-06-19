import { Outlet, NavLink } from 'react-router-dom';

const NAV = [
  { to: '/dashboard', icon: '🏠', label: 'Home' },
  { to: '/treasury',  icon: '🏦', label: 'Treasury' },
  { to: '/proposals', icon: '🗳️', label: 'Proposals' },
  { to: '/payroll',   icon: '💸', label: 'Payroll' },
  { to: '/members',   icon: '👥', label: 'Members' },
];

export default function Layout() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col max-w-lg mx-auto">
      <main className="flex-1 overflow-y-auto pb-20"><Outlet /></main>
      <nav className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-white border-t border-gray-200 flex justify-around py-2 shadow-lg" aria-label="Main navigation">
        {NAV.map(({ to, icon, label }) => (
          <NavLink key={to} to={to} className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg text-xs transition ${isActive ? 'text-brand-600 font-semibold' : 'text-gray-400 hover:text-gray-600'}`}>
            <span className="text-xl">{icon}</span><span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
