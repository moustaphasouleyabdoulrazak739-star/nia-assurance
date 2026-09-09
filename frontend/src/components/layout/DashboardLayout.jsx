import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Sidebar from '../ui/Sidebar';
import { IconMenu } from '../ui/icons';

/**
 * Coquille commune à toutes les pages du dashboard (Accueil, Contrats,
 * Sinistres, Paiements, Profil) : sidebar de navigation + en-tête mobile +
 * zone de contenu avec titre/sous-titre/actions optionnels.
 */
export default function DashboardLayout({ title, subtitle, actions, children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const initials = (
    user?.prenom?.[0] ||
    user?.first_name?.[0] ||
    user?.username?.[0] ||
    'U'
  ).toUpperCase();

  return (
    <div className="min-h-screen bg-neutral-50 lg:flex">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        user={user}
        onLogout={handleLogout}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-neutral-100 bg-white px-4 py-3 lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-lg p-2 text-neutral-600 hover:bg-neutral-100"
            aria-label="Ouvrir le menu"
          >
            <IconMenu className="h-6 w-6" />
          </button>
          <span className="font-semibold text-neutral-800">NIA Assurance</span>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-700">
            {initials}
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 lg:p-8">
          <div className="mx-auto max-w-6xl">
            {(title || actions) && (
              <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <div>
                  {title && <h1 className="text-2xl font-bold text-neutral-800">{title}</h1>}
                  {subtitle && <p className="mt-1 text-neutral-500">{subtitle}</p>}
                </div>
                {actions && <div className="flex flex-shrink-0 items-center gap-3">{actions}</div>}
              </div>
            )}
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
