import { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import api from '../services/api';
import DashboardLayout from '../components/layout/DashboardLayout';
import Card from '../components/ui/Card';
import { IconInbox } from '../components/ui/icons';
import {
  BRAND,
  CONTRAT_TYPE_COLORS,
  DEMANDE_STATUT_COLORS,
} from '../components/ui/chartColors';

// '2026-03' -> 'mars 26'
const formatMois = (mois) => {
  const [annee, m] = mois.split('-').map(Number);
  return new Date(annee, m - 1, 1)
    .toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' })
    .replace('.', '');
};

const formatFCFA = (valeur) => `${Number(valeur).toLocaleString('fr-FR')} FCFA`;
const formatFCFACourt = (valeur) =>
  valeur >= 1000 ? `${Math.round(valeur / 1000)}k` : `${valeur}`;

const TOOLTIP_STYLE = {
  borderRadius: '0.75rem',
  border: '1px solid #E7E5E4',
  boxShadow: '0 6px 20px -6px rgba(28, 25, 23, 0.15)',
  fontSize: '0.8125rem',
};

const AXIS_TICK = { fontSize: 12, fill: BRAND.axis };

function ChartCard({ title, hint, vide, children }) {
  return (
    <Card className="flex flex-col">
      <div className="mb-4">
        <h3 className="font-semibold text-neutral-800">{title}</h3>
        {hint && <p className="mt-0.5 text-xs text-neutral-400">{hint}</p>}
      </div>
      {vide ? (
        <div className="flex flex-1 flex-col items-center justify-center py-10 text-neutral-400">
          <IconInbox className="mb-2 h-8 w-8 text-neutral-300" />
          <p className="text-sm">Aucune donnée pour l'instant.</p>
        </div>
      ) : (
        children
      )}
    </Card>
  );
}

function KpiCard({ label, value, tone }) {
  const TONES = {
    orange: 'border-l-4 border-primary-600',
    green: 'border-l-4 border-secondary-700',
    amber: 'border-l-4 border-amber-500',
  };
  return (
    <Card padding="sm" className={TONES[tone]}>
      <p className="text-xs text-neutral-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-neutral-800">{value}</p>
    </Card>
  );
}

const Statistiques = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const response = await api.get('/statistiques/');
        setData(response.data);
      } catch {
        setError('Impossible de charger les statistiques.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const contratsParType = data?.contrats_par_type ?? [];
  const sinistresParMois = data?.sinistres_par_mois ?? [];
  const paiementsParMois = data?.paiements_valides_par_mois ?? [];
  const demandesParStatut = data?.demandes_par_statut ?? [];

  const totalContrats = contratsParType.reduce((s, e) => s + e.total, 0);
  const totalSinistres = sinistresParMois.reduce((s, e) => s + e.valeur, 0);
  const totalEncaisse = paiementsParMois.reduce((s, e) => s + e.valeur, 0);
  const demandesEnAttente =
    demandesParStatut.find((e) => e.statut === 'EN_ATTENTE')?.total ?? 0;

  const sinistresData = sinistresParMois.map((e) => ({
    mois: formatMois(e.mois),
    sinistres: e.valeur,
  }));
  const paiementsData = paiementsParMois.map((e) => ({
    mois: formatMois(e.mois),
    montant: e.valeur,
  }));

  return (
    <DashboardLayout
      title="Statistiques"
      subtitle="Pilotage de l'activité — espace compagnie"
    >
      {loading && (
        <div className="py-12 text-center text-neutral-400">Chargement...</div>
      )}

      {error && (
        <Card padding="sm" className="mb-4 border border-red-100 bg-red-50">
          <p className="text-sm text-red-600">{error}</p>
        </Card>
      )}

      {!loading && !error && data && (
        <div className="space-y-6">
          {/* Indicateurs clés */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <KpiCard label="Contrats" value={totalContrats} tone="orange" />
            <KpiCard label="Sinistres déclarés" value={totalSinistres} tone="amber" />
            <KpiCard label="Total encaissé" value={formatFCFA(totalEncaisse)} tone="green" />
            <KpiCard label="Demandes en attente" value={demandesEnAttente} tone="amber" />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* 1. Répartition des contrats par type */}
            <ChartCard
              title="Contrats par type d'assurance"
              hint="Répartition du portefeuille"
              vide={totalContrats === 0}
            >
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={contratsParType}
                    dataKey="total"
                    nameKey="label"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label={({ percent }) =>
                      percent > 0 ? `${Math.round(percent * 100)}%` : ''
                    }
                  >
                    {contratsParType.map((entree) => (
                      <Cell
                        key={entree.type}
                        fill={CONTRAT_TYPE_COLORS[entree.type] || BRAND.axis}
                      />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    iconType="circle"
                    formatter={(value) => (
                      <span style={{ color: BRAND.axis, fontSize: 12 }}>{value}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* 4. Répartition des demandes de contrat par statut */}
            <ChartCard
              title="Demandes de contrat par statut"
              hint="En attente / validée / rejetée"
              vide={demandesParStatut.every((e) => e.total === 0)}
            >
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={demandesParStatut}
                  margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={BRAND.grid} vertical={false} />
                  <XAxis dataKey="label" tick={AXIS_TICK} tickLine={false} />
                  <YAxis allowDecimals={false} tick={AXIS_TICK} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    cursor={{ fill: 'rgba(28,25,23,0.04)' }}
                    formatter={(value) => [value, 'Demandes']}
                  />
                  <Bar dataKey="total" name="Demandes" radius={[6, 6, 0, 0]} maxBarSize={64}>
                    {demandesParStatut.map((entree) => (
                      <Cell
                        key={entree.statut}
                        fill={DEMANDE_STATUT_COLORS[entree.statut] || BRAND.axis}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* 2. Évolution des sinistres déclarés dans le temps */}
            <ChartCard
              title="Sinistres déclarés dans le temps"
              hint="Nombre de déclarations par mois"
              vide={sinistresData.length === 0}
            >
              <ResponsiveContainer width="100%" height={280}>
                <LineChart
                  data={sinistresData}
                  margin={{ top: 8, right: 12, left: -16, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={BRAND.grid} vertical={false} />
                  <XAxis dataKey="mois" tick={AXIS_TICK} tickLine={false} />
                  <YAxis allowDecimals={false} tick={AXIS_TICK} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    formatter={(value) => [value, 'Sinistres']}
                  />
                  <Line
                    type="monotone"
                    dataKey="sinistres"
                    name="Sinistres"
                    stroke={BRAND.orange}
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: BRAND.orange }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* 3. Évolution des paiements validés dans le temps */}
            <ChartCard
              title="Paiements validés dans le temps"
              hint="Montant total encaissé par mois"
              vide={paiementsData.length === 0}
            >
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={paiementsData}
                  margin={{ top: 8, right: 12, left: 4, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={BRAND.grid} vertical={false} />
                  <XAxis dataKey="mois" tick={AXIS_TICK} tickLine={false} />
                  <YAxis
                    tick={AXIS_TICK}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={formatFCFACourt}
                    width={44}
                  />
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    cursor={{ fill: 'rgba(28,25,23,0.04)' }}
                    formatter={(value) => [formatFCFA(value), 'Encaissé']}
                  />
                  <Bar
                    dataKey="montant"
                    name="Encaissé"
                    fill={BRAND.green}
                    radius={[6, 6, 0, 0]}
                    maxBarSize={56}
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default Statistiques;
