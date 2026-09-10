import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import DashboardLayout from "../components/layout/DashboardLayout";
import Card from "../components/ui/Card";
import BackgroundPattern from "../components/ui/BackgroundPattern";
import { estEcheanceProche } from "../utils/dates";
import {
  IconFileText,
  IconAlertTriangle,
  IconCreditCard,
  IconClipboardList,
  IconClock,
} from "../components/ui/icons";

function StatCard({ icon: Icon, label, value, tone }) {
  const TONES = {
    primary: "bg-primary-50 text-primary-600",
    secondary: "bg-secondary-50 text-secondary-700",
    amber: "bg-amber-50 text-amber-600",
  };
  // Bordure gauche colorée : distingue au premier coup d'œil les cards
  // "info" (statistiques) des cards "action" (Actions rapides ci-dessous,
  // qui restent volontairement neutres).
  const BORDURES = {
    primary: "border-l-4 border-primary-600",
    secondary: "border-l-4 border-secondary-600",
    amber: "border-l-4 border-amber-500",
  };
  return (
    <Card hoverable className={`flex items-center gap-4 ${BORDURES[tone]}`}>
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

function ActiviteRow({ icon: Icon, label, value, to }) {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => navigate(to)}
      className="flex w-full items-center gap-3 rounded-xl p-3 text-left transition hover:bg-neutral-50"
    >
      <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-neutral-100 text-neutral-500">
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-neutral-400">{label}</p>
        <p className="truncate text-sm font-medium text-neutral-700">{value}</p>
      </div>
    </button>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ contratsActifs: '—', sinistresEnAttente: '—', paiementsValides: '—' });
  const [derniereActivite, setDerniereActivite] = useState({ sinistre: null, paiement: null, demande: null });
  const [contratsEcheanceProche, setContratsEcheanceProche] = useState([]);

  const isAdmin = user?.role === "ADMIN" || user?.role === "AGENT";

  const fetchDashboard = async () => {
    try {
      const [contratsRes, sinistresRes, paiementsRes, demandesRes] = await Promise.all([
        api.get('/contrats/'),
        api.get('/sinistres/'),
        api.get('/paiements/'),
        api.get('/demandes/'),
      ]);
      setStats({
        contratsActifs: contratsRes.data.filter((c) => c.statut === 'ACTIF').length,
        sinistresEnAttente: sinistresRes.data.filter((s) => s.statut === 'EN_ATTENTE').length,
        paiementsValides: paiementsRes.data.filter((p) => p.statut === 'VALIDE').length,
      });
      // Chaque liste est deja triee du plus recent au plus ancien cote API
      // (ordering des modeles) : le premier element est donc le dernier en date.
      setDerniereActivite({
        sinistre: sinistresRes.data[0] || null,
        paiement: paiementsRes.data[0] || null,
        demande: demandesRes.data[0] || null,
      });
      setContratsEcheanceProche(contratsRes.data.filter((c) => estEcheanceProche(c)));
    } catch {
      // Le tableau de bord reste utilisable meme si les stats ne chargent pas.
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchDashboard();
  }, []);

  const sinistresEnAttenteValue = stats.sinistresEnAttente;
  const sinistresTone = typeof sinistresEnAttenteValue === 'number' && sinistresEnAttenteValue > 0
    ? 'amber'
    : 'secondary';

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
      tone: sinistresTone,
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
    { label: isAdmin ? "Demandes à traiter" : "Nouvelle demande de contrat", icon: IconClipboardList, to: "/demandes" },
  ];

  const echeanceTexte = (() => {
    const n = contratsEcheanceProche.length;
    if (n === 0) return null;
    if (isAdmin) {
      return `${n} contrat${n > 1 ? 's' : ''} arrive${n > 1 ? 'nt' : ''} à échéance dans les 30 prochains jours.`;
    }
    if (n === 1) {
      const c = contratsEcheanceProche[0];
      return `Votre contrat ${c.numero_contrat} arrive à échéance le ${new Date(c.date_fin).toLocaleDateString('fr-FR')}.`;
    }
    return `${n} de vos contrats arrivent à échéance dans les 30 prochains jours.`;
  })();

  return (
    <DashboardLayout
      title="Accueil"
      subtitle={isAdmin ? "Vue d'ensemble — espace compagnie" : "Vue d'ensemble de votre espace"}
    >
      {/* Motif de marque tres discret derriere toute la zone de contenu.
          Le motif est en position absolute (z-index:auto) : sans le wrapper
          "relative z-10" ci-dessous, l'ordre de peinture CSS le ferait
          passer AU-DESSUS des cards non positionnees, pas derriere. */}
      <div className="relative">
        <BackgroundPattern className="text-neutral-900/[0.03]" />

        <div className="relative z-10">
          {/* Bienvenue */}
          <div className="relative overflow-hidden rounded-2xl bg-primary-600 p-6 mb-6 text-white">
            <BackgroundPattern className="text-white/[0.08]" />
            <div className="relative">
              <h2 className="text-xl font-bold mb-1">
                Bienvenue, {user?.prenom} 👋
              </h2>
              <p className="text-white/85 text-sm">
                {isAdmin
                  ? "Gérez les contrats, sinistres et paiements de vos clients."
                  : "Gérez vos assurances facilement depuis votre espace personnel."}
              </p>
            </div>
          </div>

          {/* Bandeau échéance */}
          {echeanceTexte && (
            <Card padding="sm" className="mb-6 flex items-center gap-3 border border-amber-100 bg-amber-50">
              <IconClock className="h-5 w-5 flex-shrink-0 text-amber-600" />
              <p className="text-sm text-amber-800">{echeanceTexte}</p>
            </Card>
          )}

          {/* Statistiques */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            {statCards.map((s) => (
              <StatCard key={s.label} {...s} />
            ))}
          </div>

          {/* Actions rapides */}
          <Card>
            <h3 className="font-semibold text-neutral-800 mb-4">Actions rapides</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {quickActions.map(({ label, icon: Icon, to }) => (
                <Card
                  key={to}
                  as="button"
                  type="button"
                  hoverable
                  onClick={() => navigate(to)}
                  className="group flex flex-col items-center gap-2 text-center"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-primary-600 transition group-hover:bg-primary-100">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="text-sm font-medium text-neutral-700">
                    {label}
                  </span>
                </Card>
              ))}
            </div>
          </Card>

          {/* Dernière activité */}
          <Card className="mt-6">
            <h3 className="font-semibold text-neutral-800 mb-2">Dernière activité</h3>
            <div className="space-y-1">
              <ActiviteRow
                icon={IconAlertTriangle}
                label="Dernier sinistre déclaré"
                value={
                  derniereActivite.sinistre
                    ? `${derniereActivite.sinistre.numero_sinistre} — ${derniereActivite.sinistre.statut_display}`
                    : 'Aucun sinistre déclaré'
                }
                to="/sinistres"
              />
              <ActiviteRow
                icon={IconCreditCard}
                label="Dernier paiement"
                value={
                  derniereActivite.paiement
                    ? `${Number(derniereActivite.paiement.montant).toLocaleString()} FCFA — ${derniereActivite.paiement.statut_display}`
                    : 'Aucun paiement effectué'
                }
                to="/paiements"
              />
              <ActiviteRow
                icon={IconClipboardList}
                label="Dernière demande de contrat"
                value={
                  derniereActivite.demande
                    ? `${derniereActivite.demande.type_assurance_display} — ${derniereActivite.demande.statut_display}`
                    : 'Aucune demande envoyée'
                }
                to="/demandes"
              />
            </div>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
