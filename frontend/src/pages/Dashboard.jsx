import { useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import AuthContext from "../context/AuthContext";

// Icônes SVG inline
const Icons = {
  Shield: () => (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ),
  FileText: () => (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  AlertTriangle: () => (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  CreditCard: () => (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>
  ),
  User: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
  Logout: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  ),
  Menu: () => (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  ),
};

// Carte statistique
function StatCard({ icon: Icon, label, value, color, bg }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center gap-4">
      <div className={`flex-shrink-0 w-12 h-12 ${bg} rounded-xl flex items-center justify-center ${color}`}>
        <Icon />
      </div>
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-2xl font-bold text-gray-800">{value}</p>
      </div>
    </div>
  );
}

// Module "à venir"
function ComingSoon({ label }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
      <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
        <svg className="w-7 h-7 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6l4 2m6-2a10 10 0 11-20 0 10 10 0 0120 0z" />
        </svg>
      </div>
      <p className="text-gray-500 text-sm font-medium">{label} — Bientôt disponible</p>
    </div>
  );
}

export default function Dashboard() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("accueil");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const navItems = [
    { id: "accueil", label: "Accueil", icon: Icons.Shield },
    { id: "contrats", label: "Contrats", icon: Icons.FileText },
    { id: "sinistres", label: "Sinistres", icon: Icons.AlertTriangle },
    { id: "paiements", label: "Paiements", icon: Icons.CreditCard },
    { id: "profil", label: "Mon profil", icon: Icons.User },
  ];

  const stats = [
    { icon: Icons.FileText, label: "Contrats actifs", value: "0", color: "text-blue-600", bg: "bg-blue-50" },
    { icon: Icons.AlertTriangle, label: "Sinistres déclarés", value: "0", color: "text-orange-500", bg: "bg-orange-50" },
    { icon: Icons.CreditCard, label: "Paiements effectués", value: "0", color: "text-green-600", bg: "bg-green-50" },
    { icon: Icons.Shield, label: "Couverture active", value: "—", color: "text-purple-600", bg: "bg-purple-50" },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case "accueil":
        return (
          <div>
            {/* Bienvenue */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 mb-6 text-white">
              <h2 className="text-xl font-bold mb-1">
                Bienvenue, {user?.first_name || user?.username} 👋
              </h2>
              <p className="text-blue-100 text-sm">
                Gérez vos assurances facilement depuis votre espace personnel.
              </p>
            </div>

            {/* Statistiques */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {stats.map((s, i) => (
                <StatCard key={i} {...s} />
              ))}
            </div>

            {/* Actions rapides */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="font-semibold text-gray-800 mb-4">Actions rapides</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { label: "Nouveau devis", icon: "📋", tab: "contrats" },
                  { label: "Déclarer un sinistre", icon: "🚨", tab: "sinistres" },
                  { label: "Effectuer un paiement", icon: "💳", tab: "paiements" },
                ].map((action) => (
                  <button
                    key={action.tab}
                    onClick={() => setActiveTab(action.tab)}
                    className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-dashed border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition text-center group"
                  >
                    <span className="text-2xl">{action.icon}</span>
                    <span className="text-sm text-gray-600 group-hover:text-blue-600 font-medium">
                      {action.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        );

      case "profil":
        return (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
            <div className="flex items-center gap-5 mb-6">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-3xl font-bold">
                {(user?.first_name?.[0] || user?.username?.[0] || "U").toUpperCase()}
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-800">
                  {user?.first_name} {user?.last_name}
                </h2>
                <p className="text-gray-500 text-sm">{user?.email}</p>
                <span className="inline-block mt-1 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                  @{user?.username}
                </span>
              </div>
            </div>
            <div className="border-t pt-4 space-y-3">
              {[
                { label: "Prénom", value: user?.first_name || "—" },
                { label: "Nom", value: user?.last_name || "—" },
                { label: "Nom d'utilisateur", value: user?.username || "—" },
                { label: "Email", value: user?.email || "—" },
              ].map((field) => (
                <div key={field.label} className="flex justify-between py-2 border-b border-gray-50">
                  <span className="text-sm text-gray-500">{field.label}</span>
                  <span className="text-sm font-medium text-gray-700">{field.value}</span>
                </div>
              ))}
            </div>
            <button className="mt-6 w-full border border-blue-600 text-blue-600 hover:bg-blue-50 font-medium py-2.5 rounded-lg transition text-sm">
              Modifier le profil
            </button>
          </div>
        );

      default:
        return (
          <ComingSoon
            label={navItems.find((n) => n.id === activeTab)?.label || activeTab}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-white shadow-xl transform transition-transform duration-300 lg:translate-x-0 lg:static lg:shadow-none lg:border-r border-gray-100 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-100">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center">
            <Icons.Shield />
          </div>
          <div>
            <p className="font-bold text-gray-800 text-sm">Nia Assurance</p>
            <p className="text-xs text-gray-400">Espace client</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-1">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => { setActiveTab(id); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition ${
                activeTab === id
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-800"
              }`}
            >
              <Icon />
              {label}
            </button>
          ))}
        </nav>

        {/* Déconnexion */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-100">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 transition"
          >
            <Icons.Logout />
            Déconnexion
          </button>
        </div>
      </aside>

      {/* Overlay mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Contenu principal */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header mobile */}
        <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between lg:hidden">
          <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-lg hover:bg-gray-100">
            <Icons.Menu />
          </button>
          <span className="font-semibold text-gray-800">Nia Assurance</span>
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-sm">
            {(user?.first_name?.[0] || user?.username?.[0] || "U").toUpperCase()}
          </div>
        </header>

        {/* Contenu */}
        <main className="flex-1 p-4 lg:p-8 overflow-auto">
          <div className="max-w-5xl mx-auto">
            {/* Titre page */}
            <div className="mb-6 hidden lg:block">
              <h1 className="text-2xl font-bold text-gray-800">
                {navItems.find((n) => n.id === activeTab)?.label}
              </h1>
            </div>
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
}
