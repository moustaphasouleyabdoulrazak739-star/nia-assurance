import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import DashboardLayout from "../components/layout/DashboardLayout";
import Card from "../components/ui/Card";
import { estEcheanceProche } from "../utils/dates";
import { formaterMontant } from "../utils/format";
import {
  IconAlertTriangle,
  IconCreditCard,
  IconClipboardList,
  IconClock,
} from "../components/ui/icons";

function StatCard({ label, value }) {
  return (
    <Card>
      <p className="text-sm text-neutral-500">{label}</p>
      <p className="text-2xl font-bold text-neutral-800">{value}</p>
    </Card>
  );
}

function ActiviteRow({ label, value, to }) {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => navigate(to)}
      className="flex w-full items-center rounded-lg p-3 text-left transition hover:bg-neutral-50"
    >
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
  const [stats, setStats] = useState({ contratsActifs: '...', sinistresEnAttente: '...', paiementsValides: '...' });
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

  const statCards = [
    {
      label: isAdmin ? "Contrats actifs (tous clients)" : "Mes contrats actifs",
      value: stats.contratsActifs,
    },
    {
      label: isAdmin ? "Sinistres en attente" : "Mes sinistres en attente",
      value: stats.sinistresEnAttente,
    },
    {
      label: isAdmin ? "Paiements validés" : "Mes paiements validés",
      value: stats.paiementsValides,
    },
  ];

  // Seulement les actions qui ne sont pas deja a un clic dans le menu
  // lateral sous la forme d'une simple liste.
  const quickActions = isAdmin
    ? [
        { label: "Demandes à traiter", icon: IconClipboardList, to: "/demandes" },
        { label: "Sinistres à traiter", icon: IconAlertTriangle, to: "/sinistres" },
      ]
    : [
        { label: "Déclarer un sinistre", icon: IconAlertTriangle, to: "/sinistres" },
        { label: "Payer une prime", icon: IconCreditCard, to: "/paiements" },
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
      title={user?.prenom ? `Bienvenue, ${user.prenom}` : "Accueil"}
    >
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
        <h3 className="font-bold text-neutral-800 mb-4">Actions rapides</h3>
        <div className="grid grid-cols-2 gap-3">
          {quickActions.map(({ label, icon: Icon, to }) => (
            <Card
              key={to}
              as="button"
              type="button"
              hoverable
              onClick={() => navigate(to)}
              className="group flex flex-col items-center gap-2 text-center"
            >
              <Icon className="h-5 w-5 text-primary-600" />
              <span className="text-sm font-medium text-neutral-700">
                {label}
              </span>
            </Card>
          ))}
        </div>
      </Card>

      {/* Dernière activité */}
      <Card className="mt-6">
        <h3 className="font-bold text-neutral-800 mb-2">Dernière activité</h3>
        <div className="space-y-1">
          <ActiviteRow
            label="Dernier sinistre déclaré"
            value={
              derniereActivite.sinistre
                ? `${derniereActivite.sinistre.numero_sinistre}, ${derniereActivite.sinistre.statut_display}`
                : 'Aucun sinistre déclaré'
            }
            to="/sinistres"
          />
          <ActiviteRow
            label="Dernier paiement"
            value={
              derniereActivite.paiement
                ? `${formaterMontant(derniereActivite.paiement.montant)}, ${derniereActivite.paiement.statut_display}`
                : 'Aucun paiement effectué'
            }
            to="/paiements"
          />
          <ActiviteRow
            label="Dernière demande de contrat"
            value={
              derniereActivite.demande
                ? `${derniereActivite.demande.type_assurance_display}, ${derniereActivite.demande.statut_display}`
                : 'Aucune demande envoyée'
            }
            to="/demandes"
          />
        </div>
      </Card>
    </DashboardLayout>
  );
}
