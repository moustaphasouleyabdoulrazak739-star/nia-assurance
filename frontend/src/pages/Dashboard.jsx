import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import DashboardLayout from "../components/layout/DashboardLayout";
import Card from "../components/ui/Card";
import {
  IconFileText,
  IconAlertTriangle,
  IconCreditCard,
} from "../components/ui/icons";

function StatCard({ icon: Icon, label, value, tone }) {
  const TONES = {
    primary: "bg-primary-50 text-primary-600",
    secondary: "bg-secondary-50 text-secondary-700",
    amber: "bg-amber-50 text-amber-600",
  };
  return (
    <Card hoverable className="flex items-center gap-4">
      <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl ${TONES[tone]}`}>
        <Icon className="h-6 w-6" />
      </div>
      <div>
        <p className="text-sm text-neutral-500">{label}</p>
        <p className="text-2xl font-bold text-neutral-800">{value}</p>
      </div>
    </Card>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ contratsActifs: '—', sinistresEnAttente: '—', paiementsValides: '—' });

  const isAdmin = user?.role === "ADMIN" || user?.role === "AGENT";

  const fetchStats = async () => {
    try {
      const [contratsRes, sinistresRes, paiementsRes] = await Promise.all([
        api.get('/contrats/'),
        api.get('/sinistres/'),
        api.get('/paiements/'),
      ]);
      setStats({
        contratsActifs: contratsRes.data.filter((c) => c.statut === 'ACTIF').length,
        sinistresEnAttente: sinistresRes.data.filter((s) => s.statut === 'EN_ATTENTE').length,
        paiementsValides: paiementsRes.data.filter((p) => p.statut === 'VALIDE').length,
      });
    } catch {
      // Le tableau de bord reste utilisable meme si les stats ne chargent pas.
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchStats();
  }, []);

  const statCards = [
    {
      icon: IconFileText,
      label: isAdmin ? "Contrats actifs (tous clients)" : "Mes contrats actifs",
      value: stats.contratsActifs,
      tone: "primary",
    },
    {
      icon: IconAlertTriangle,
      label: isAdmin ? "Sinistres en attente" : "Mes sinistres en attente",
      value: stats.sinistresEnAttente,
      tone: "amber",
    },
    {
      icon: IconCreditCard,
      label: isAdmin ? "Paiements validés" : "Mes paiements validés",
      value: stats.paiementsValides,
      tone: "secondary",
    },
  ];

  const quickActions = [
    { label: isAdmin ? "Gérer les contrats" : "Mes contrats", icon: IconFileText, to: "/contrats" },
    { label: isAdmin ? "Sinistres à traiter" : "Déclarer un sinistre", icon: IconAlertTriangle, to: "/sinistres" },
    { label: isAdmin ? "Suivi paiements" : "Effectuer un paiement", icon: IconCreditCard, to: "/paiements" },
  ];

  return (
    <DashboardLayout
      title="Accueil"
      subtitle={isAdmin ? "Vue d'ensemble — espace compagnie" : "Vue d'ensemble de votre espace"}
    >
      {/* Bienvenue */}
      <div className="rounded-2xl bg-primary-600 p-6 mb-6 text-white">
        <h2 className="text-xl font-bold mb-1">
          Bienvenue, {user?.prenom} 👋
        </h2>
        <p className="text-white/85 text-sm">
          {isAdmin
            ? "Gérez les contrats, sinistres et paiements de vos clients."
            : "Gérez vos assurances facilement depuis votre espace personnel."}
        </p>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {statCards.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      {/* Actions rapides */}
      <Card>
        <h3 className="font-semibold text-neutral-800 mb-4">Actions rapides</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {quickActions.map(({ label, icon: Icon, to }) => (
            <button
              key={to}
              onClick={() => navigate(to)}
              className="group flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-neutral-200 p-4 text-center transition hover:border-primary-300 hover:bg-primary-50"
            >
              <Icon className="h-6 w-6 text-neutral-400 group-hover:text-primary-600" />
              <span className="text-sm font-medium text-neutral-600 group-hover:text-primary-700">
                {label}
              </span>
            </button>
          ))}
        </div>
      </Card>
    </DashboardLayout>
  );
}
