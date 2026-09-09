import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import DashboardLayout from '../components/layout/DashboardLayout';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { Select, Textarea, Input } from '../components/ui/Input';
import { SINISTRE_STATUS_VARIANTS } from '../components/ui/statusVariants';
import { IconClose, IconDownload, IconInbox } from '../components/ui/icons';

const Sinistres = () => {
  const { user } = useAuth();
  const [sinistres, setSinistres] = useState([]);
  const [contrats, setContrats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [form, setForm] = useState({
    contrat: '',
    type_sinistre: '',
    date_sinistre: '',
    description: '',
    montant_reclame: '',
  });

  const [reviewTarget, setReviewTarget] = useState(null);
  const [reviewForm, setReviewForm] = useState({ statut: '', montant_indemnite: '', commentaire: '' });
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState('');

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'AGENT';

  const fetchSinistres = async () => {
    try {
      setLoading(true);
      const response = await api.get('/sinistres/');
      setSinistres(response.data);
    } catch {
      setError('Impossible de charger les sinistres.');
    } finally {
      setLoading(false);
    }
  };

  const fetchContrats = async () => {
    try {
      const response = await api.get('/contrats/');
      setContrats(response.data);
    } catch (err) {
      console.error('Erreur contrats', err);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchSinistres();
    fetchContrats();
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError('');
    setFormSuccess('');
    try {
      await api.post('/sinistres/create/', form);
      setFormSuccess('Sinistre déclaré avec succès !');
      setForm({
        contrat: '',
        type_sinistre: '',
        date_sinistre: '',
        description: '',
        montant_reclame: '',
      });
      fetchSinistres();
      setTimeout(() => {
        setShowModal(false);
        setFormSuccess('');
      }, 2000);
    } catch {
      setFormError('Erreur lors de la déclaration. Vérifiez les informations.');
    } finally {
      setFormLoading(false);
    }
  };

  const openReview = (sinistre) => {
    setReviewTarget(sinistre);
    setReviewForm({
      statut: sinistre.statut,
      montant_indemnite: sinistre.montant_indemnite || '',
      commentaire: sinistre.commentaire || '',
    });
    setReviewError('');
  };

  const handleReviewChange = (e) => {
    setReviewForm({ ...reviewForm, [e.target.name]: e.target.value });
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    setReviewLoading(true);
    setReviewError('');
    try {
      await api.patch(`/sinistres/${reviewTarget.id}/`, reviewForm);
      setReviewTarget(null);
      fetchSinistres();
    } catch (err) {
      const data = err.response?.data;
      const message = data && typeof data === 'object'
        ? Object.values(data).flat().join(' ')
        : 'Erreur lors du traitement du dossier.';
      setReviewError(message);
    } finally {
      setReviewLoading(false);
    }
  };

  return (
    <DashboardLayout
      title={isAdmin ? 'Sinistres' : 'Mes sinistres'}
      subtitle={isAdmin ? 'Liste de tous les sinistres' : 'Vos déclarations de sinistres'}
      actions={<Button variant="secondary" onClick={() => setShowModal(true)}>Déclarer un sinistre</Button>}
    >
      {loading && (
        <div className="py-12 text-center text-neutral-400">Chargement...</div>
      )}

      {error && (
        <Card padding="sm" className="mb-4 border border-red-100 bg-red-50">
          <p className="text-sm text-red-600">{error}</p>
        </Card>
      )}

      {!loading && !error && sinistres.length === 0 && (
        <Card padding="lg" className="text-center text-neutral-400">
          <IconInbox className="mx-auto mb-3 h-10 w-10 text-neutral-300" />
          <p className="mb-4">Aucun sinistre déclaré.</p>
          <Button variant="secondary" onClick={() => setShowModal(true)}>
            Déclarer mon premier sinistre
          </Button>
        </Card>
      )}

      <div className="grid gap-4">
        {sinistres.map(sinistre => (
          <Card key={sinistre.id} hoverable>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2 flex-wrap">
                  <h3 className="font-bold text-neutral-800 text-lg">
                    {sinistre.numero_sinistre}
                  </h3>
                  <Badge variant={SINISTRE_STATUS_VARIANTS[sinistre.statut] || 'neutral'}>
                    {sinistre.statut}
                  </Badge>
                </div>
                <p className="text-neutral-500 text-sm">{sinistre.type_sinistre}</p>
                <p className="text-neutral-400 text-xs mt-1">
                  Date sinistre : {sinistre.date_sinistre}
                </p>
                <p className="text-neutral-400 text-xs mt-1">
                  Contrat : {sinistre.contrat?.numero_contrat}
                  {isAdmin && sinistre.contrat?.client?.user && (
                    <> — {sinistre.contrat.client.user.prenom} {sinistre.contrat.client.user.nom}</>
                  )}
                </p>
                {sinistre.description && (
                  <p className="text-neutral-500 text-sm mt-2">{sinistre.description}</p>
                )}
                {sinistre.commentaire && (
                  <p className="text-secondary-700 text-sm mt-2 italic">Note compagnie : {sinistre.commentaire}</p>
                )}
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-primary-600">
                  {Number(sinistre.montant_reclame).toLocaleString()} FCFA
                </p>
                <p className="text-neutral-400 text-xs">Montant réclamé</p>
                {sinistre.montant_indemnite && (
                  <div className="mt-1">
                    <p className="text-lg font-bold text-secondary-700">
                      {Number(sinistre.montant_indemnite).toLocaleString()} FCFA
                    </p>
                    <p className="text-neutral-400 text-xs">Indemnité</p>
                  </div>
                )}
                {sinistre.document && (
                  <a
                    href={'http://127.0.0.1:8000' + sinistre.document}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-secondary-50 px-3 py-1.5 text-xs font-medium text-secondary-700 hover:bg-secondary-100"
                  >
                    <IconDownload className="h-3.5 w-3.5" />
                    Télécharger PDF
                  </a>
                )}
                {isAdmin && (
                  <button
                    onClick={() => openReview(sinistre)}
                    className="mt-2 block rounded-lg bg-primary-50 px-3 py-1.5 text-xs font-medium text-primary-700 hover:bg-primary-100 ml-auto"
                  >
                    Traiter
                  </button>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Modal déclaration (client) */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-card-hover">

            <div className="flex items-center justify-between rounded-t-2xl bg-secondary-700 px-6 py-4">
              <h3 className="text-lg font-bold text-white">Déclarer un sinistre</h3>
              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg p-1 text-white/80 hover:bg-white/10 hover:text-white"
                aria-label="Fermer"
              >
                <IconClose className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 p-6">

              {formError && (
                <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
                  {formError}
                </div>
              )}

              {formSuccess && (
                <div className="rounded-lg bg-secondary-50 p-3 text-sm text-secondary-700">
                  {formSuccess}
                </div>
              )}

              <Select
                id="contrat"
                label="Contrat concerné"
                name="contrat"
                value={form.contrat}
                onChange={handleChange}
                required
              >
                <option value="">Choisir un contrat</option>
                {contrats.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.numero_contrat} - {c.type_assurance}
                  </option>
                ))}
              </Select>

              <Select
                id="type_sinistre"
                label="Type de sinistre"
                name="type_sinistre"
                value={form.type_sinistre}
                onChange={handleChange}
                required
              >
                <option value="">Choisir le type</option>
                <option value="ACCIDENT">Accident</option>
                <option value="VOL">Vol</option>
                <option value="INCENDIE">Incendie</option>
                <option value="MALADIE">Maladie</option>
                <option value="DECES">Décès</option>
                <option value="AUTRE">Autre</option>
              </Select>

              <Input
                id="date_sinistre"
                label="Date du sinistre"
                type="date"
                name="date_sinistre"
                value={form.date_sinistre}
                onChange={handleChange}
                required
              />

              <Textarea
                id="description"
                label="Description"
                name="description"
                value={form.description}
                onChange={handleChange}
                rows={3}
                placeholder="Décrivez le sinistre..."
                required
              />

              <Input
                id="montant_reclame"
                label="Montant réclamé (FCFA)"
                type="number"
                name="montant_reclame"
                value={form.montant_reclame}
                onChange={handleChange}
                placeholder="Ex: 150000"
                required
              />

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  fullWidth
                  onClick={() => setShowModal(false)}
                  className="bg-neutral-100"
                >
                  Annuler
                </Button>
                <Button type="submit" variant="secondary" fullWidth loading={formLoading}>
                  {formLoading ? 'Envoi...' : 'Déclarer'}
                </Button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Modal traitement (compagnie) */}
      {reviewTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-card-hover">

            <div className="flex items-center justify-between rounded-t-2xl bg-primary-600 px-6 py-4">
              <h3 className="text-lg font-bold text-white">Traiter le sinistre {reviewTarget.numero_sinistre}</h3>
              <button
                onClick={() => setReviewTarget(null)}
                className="rounded-lg p-1 text-white/80 hover:bg-white/10 hover:text-white"
                aria-label="Fermer"
              >
                <IconClose className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleReviewSubmit} className="space-y-4 p-6">

              {reviewError && (
                <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
                  {reviewError}
                </div>
              )}

              <Card padding="sm" className="bg-neutral-50 text-sm text-neutral-600">
                <p><strong>Type :</strong> {reviewTarget.type_sinistre}</p>
                <p><strong>Montant réclamé :</strong> {Number(reviewTarget.montant_reclame).toLocaleString()} FCFA</p>
                {reviewTarget.description && <p><strong>Description :</strong> {reviewTarget.description}</p>}
              </Card>

              <Select
                id="review_statut"
                label="Statut du dossier"
                name="statut"
                value={reviewForm.statut}
                onChange={handleReviewChange}
                required
              >
                <option value="EN_ATTENTE">En attente</option>
                <option value="EN_COURS">En cours d'instruction</option>
                <option value="APPROUVE">Approuvé</option>
                <option value="REJETE">Rejeté</option>
                <option value="REGLE">Réglé</option>
              </Select>

              <Input
                id="montant_indemnite"
                label="Montant de l'indemnité (FCFA)"
                type="number"
                name="montant_indemnite"
                value={reviewForm.montant_indemnite}
                onChange={handleReviewChange}
                placeholder="Requis si Approuvé ou Réglé"
              />

              <Textarea
                id="commentaire"
                label="Commentaire (visible par le client)"
                name="commentaire"
                value={reviewForm.commentaire}
                onChange={handleReviewChange}
                rows={3}
                placeholder="Motif de la décision, précisions..."
              />

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  fullWidth
                  onClick={() => setReviewTarget(null)}
                  className="bg-neutral-100"
                >
                  Annuler
                </Button>
                <Button type="submit" fullWidth loading={reviewLoading}>
                  {reviewLoading ? 'Envoi...' : 'Enregistrer'}
                </Button>
              </div>

            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default Sinistres;
