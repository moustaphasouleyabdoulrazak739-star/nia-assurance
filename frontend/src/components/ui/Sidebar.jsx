import { NavLink } from 'react-router-dom';
import logo from '../../assets/logo-nia.png';
import {
  IconHome,
  IconFileText,
  IconAlertTriangle,
  IconCreditCard,
  IconUser,
  IconLogout,
} from './icons';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Accueil', icon: IconHome },
  { to: '/contrats', label: 'Contrats', icon: IconFileText },
  { to: '/sinistres', label: 'Sinistres', icon: IconAlertTriangle },
  { to: '/paiements', label: 'Paiements', icon: IconCreditCard },
  { to: '/profil', label: 'Mon profil', icon: IconUser },
];

/**
 * Navigation latérale du dashboard — commune à l'espace client et à l'espace
 * compagnie (agent/admin). `open` pilote l'affichage mobile (drawer).
 */
export default function Sidebar({ open, onClose, user, onLogout }) {
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'AGENT';

  return (
    <>
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-white shadow-card transition-transform duration-300 lg:static lg:translate-x-0 lg:shadow-none lg:border-r lg:border-neutral-100 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center gap-3 border-b border-neutral-100 px-6 py-5">
          <img src={logo} alt="NIA Assurance" className="h-10 w-10 flex-shrink-0 object-contain" />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-neutral-800">NIA Assurance</p>
            <p className="text-xs text-neutral-400">{isAdmin ? 'Espace compagnie' : 'Espace client'}</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-4">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-800'
                }`
              }
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-neutral-100 p-4">
          <button
            onClick={onLogout}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium text-red-500 transition hover:bg-red-50"
          >
            <IconLogout className="h-5 w-5" />
            Déconnexion
          </button>
        </div>
      </aside>

      {open && (
        <div
          className="fixed inset-0 z-30 bg-neutral-900/40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
    </>
  );
}
