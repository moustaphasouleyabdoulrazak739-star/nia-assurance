import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import DashboardLayout from '../components/layout/DashboardLayout';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { CONTRAT_STATUS_VARIANTS } from '../components/ui/statusVariants';
import { IconDownload, IconInbox } from '../components/ui/icons';

const FILTRES = ['TOUS', 'ACTIF', 'EXPIRE', 'SUSPENDU', 'RESILIE'];

const Contrats = () => {
  const { user } = useAuth();
  const [contrats, setContrats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filtre, setFiltre] = useState('TOUS');

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'AGENT';

  const fetchContrats = async () => {
    try {
      setLoading(true);
      const response = await api.get('/contrats/');
      setContrats(response.data);
    } catch {
      setError('Impossible de charger les contrats.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContrats();
  }, []);

  const contratsFiltres = filtre === 'TOUS'
    ? contrats
    : contrats.filter(c => c.statut === filtre);

  return (
    <DashboardLayout
      title="Mes contrats"
      subtitle={isAdmin ? 'Liste de tous les contrats' : 'Vos contrats en cours'}
      actions={isAdmin && <Button>Nouveau contrat</Button>}
    >
      <div className="flex gap-2 mb-6 flex-wrap">
        {FILTRES.map(f => (
          <button
            key={f}
            onClick={() => setFiltre(f)}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
              filtre === f
                ? 'bg-primary-600 text-white'
                : 'bg-white text-neutral-600 shadow-card hover:bg-neutral-50'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {loading && (
        <div className="py-12 text-center text-neutral-400">Chargement...</div>
      )}

      {error && (
        <Card padding="sm" className="mb-4 border border-red-100 bg-red-50">
          <p className="text-sm text-red-600">{error}</p>
        </Card>
      )}

      {!loading && !error && contratsFiltres.length === 0 && (
        <Card padding="lg" className="text-center text-neutral-400">
          <IconInbox className="mx-auto mb-3 h-10 w-10 text-neutral-300" />
          <p>Aucun contrat trouvé.</p>
        </Card>
      )}

      <div className="grid gap-4">
        {contratsFiltres.map(contrat => (
          <Card key={contrat.id} hoverable>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h3 className="font-bold text-neutral-800 text-lg">
                  {contrat.numero_contrat}
                </h3>
                <p className="text-neutral-500 text-sm">{contrat.type_assurance}</p>
                <p className="text-neutral-400 text-xs mt-1">
                  Du {contrat.date_debut} au {contrat.date_fin}
                </p>
                <Badge variant={CONTRAT_STATUS_VARIANTS[contrat.statut] || 'neutral'} className="mt-2">
                  {contrat.statut}
                </Badge>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-primary-600">
                  {Number(contrat.montant_prime).toLocaleString()} FCFA
                </p>
                <div className="mt-2 flex flex-col items-end gap-2">
                  {contrat.document && (
                    <a
                      href={'http://127.0.0.1:8000' + contrat.document}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg bg-secondary-50 px-3 py-1.5 text-xs font-medium text-secondary-700 hover:bg-secondary-100"
                    >
                      <IconDownload className="h-3.5 w-3.5" />
                      Télécharger PDF
                    </a>
                  )}
                  {isAdmin && (
                    <button className="rounded-lg bg-primary-50 px-3 py-1.5 text-xs font-medium text-primary-700 hover:bg-primary-100">
                      Modifier
                    </button>
                  )}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </DashboardLayout>
  );
};

export default Contrats;
