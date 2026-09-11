import { useState, useEffect } from 'react';
import api from '../services/api';
import DashboardLayout from '../components/layout/DashboardLayout';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { JOURNAL_ACTION_VARIANTS } from '../components/ui/statusVariants';
import { IconInbox, IconListBullet } from '../components/ui/icons';

const Journal = () => {
  const [entrees, setEntrees] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSuivanteDisponible, setPageSuivanteDisponible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingPlus, setLoadingPlus] = useState(false);
  const [error, setError] = useState('');

  const fetchJournal = async (numeroPage) => {
    const response = await api.get('/journal/', { params: { page: numeroPage } });
    setPageSuivanteDisponible(Boolean(response.data.next));
    return response.data.results;
  };

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const resultats = await fetchJournal(1);
        setEntrees(resultats);
      } catch {
        setError("Impossible de charger le journal d'activité.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const chargerPlus = async () => {
    setLoadingPlus(true);
    try {
      const pageSuivante = page + 1;
      const resultats = await fetchJournal(pageSuivante);
      setEntrees((prev) => [...prev, ...resultats]);
      setPage(pageSuivante);
    } catch {
      setError("Impossible de charger la suite du journal.");
    } finally {
      setLoadingPlus(false);
    }
  };

  return (
    <DashboardLayout
      title="Journal d'activité"
      subtitle="Historique des actions effectuées par la compagnie"
    >
      {loading && (
        <div className="py-12 text-center text-neutral-400">Chargement...</div>
      )}

      {error && (
        <Card padding="sm" className="mb-4 border border-red-100 bg-red-50">
          <p className="text-sm text-red-600">{error}</p>
        </Card>
      )}

      {!loading && !error && entrees.length === 0 && (
        <Card padding="lg" className="text-center text-neutral-400">
          <IconInbox className="mx-auto mb-3 h-10 w-10 text-neutral-300" />
          <p>Aucune activité enregistrée pour l'instant.</p>
        </Card>
      )}

      {entrees.length > 0 && (
        <div className="space-y-3">
          {entrees.map((entree) => (
            <Card key={entree.id} className="flex items-start gap-4">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-neutral-100 text-neutral-500">
                <IconListBullet className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-neutral-800">{entree.utilisateur_nom}</span>
                  <Badge variant={JOURNAL_ACTION_VARIANTS[entree.action] || 'neutral'}>
                    {entree.action_display}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-neutral-600">{entree.resume}</p>
                <p className="mt-1 text-xs text-neutral-400">
                  {new Date(entree.date_creation).toLocaleString('fr-FR')}
                </p>
              </div>
            </Card>
          ))}
        </div>
      )}

      {pageSuivanteDisponible && (
        <div className="mt-4 flex justify-center">
          <Button variant="outline" onClick={chargerPlus} loading={loadingPlus}>
            {loadingPlus ? 'Chargement...' : 'Charger plus'}
          </Button>
        </div>
      )}
    </DashboardLayout>
  );
};

export default Journal;
