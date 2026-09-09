import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import DashboardLayout from '../components/layout/DashboardLayout';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { Select, Textarea, Input } from '../components/ui/Input';
import { DEMANDE_STATUS_VARIANTS } from '../components/ui/statusVariants';
import { TYPES_ASSURANCE, DOCUMENTS_PAR_TYPE } from '../constants/demandes';
import { IconClose, IconDownload, IconInbox, IconRefresh } from '../components/ui/icons';

const FILTRES_ADMIN = ['EN_ATTENTE', 'VALIDEE', 'REJETEE', 'TOUS'];
const FILTRE_LABELS = {
  EN_ATTENTE: 'En attente',
  VALIDEE: 'Validées',
  REJETEE: 'Rejetées',
  TOUS: 'Toutes',
};

const FORM_VIDE = { type_assurance: '' };

function extraireMessageErreur(err, messageParDefaut) {
  const data = err.response?.data;
  if (data && typeof data === 'object') {
    return Object.values(data)
      .map((v) => (Array.isArray(v) ? v.join(' ') : v))
      .join(' ');
  }
  return messageParDefaut;
}

const Demandes = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'AGENT';

  const [demandes, setDemandes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filtre, setFiltre] = useState('EN_ATTENTE');

  const fetchDemandes = async () => {
    try {
      setLoading(true);
      const params = isAdmin && filtre !== 'TOUS' ? { statut: filtre } : {};
      const response = await api.get('/demandes/', { params });
      setDemandes(response.data);
    } catch {
      setError('Impossible de charger les demandes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchDemandes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtre]);

  return isAdmin ? (
    <VueCompagnie
      demandes={demandes}
      loading={loading}
      error={error}
      filtre={filtre}
      setFiltre={setFiltre}
      onRefresh={fetchDemandes}
    />
  ) : (
    <VueClient demandes={demandes} loading={loading} error={error} onRefresh={fetchDemandes} />
  );
};

// ---------------------------------------------------------------------------
// Espace client : formulaire de demande + historique
// ---------------------------------------------------------------------------

function VueClient({ demandes, loading, error, onRefresh }) {
  const formRef = useRef(null);
  const [form, setForm] = useState(FORM_VIDE);
  const [files, setFiles] = useState({});
  const [resoumettreId, setResoumettreId] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  const documentsRequis = DOCUMENTS_PAR_TYPE[form.type_assurance] || [];

  const handleTypeChange = (e) => {
    setForm({ type_assurance: e.target.value });
    setFiles({});
  };

  const handleFileChange = (champ, file) => {
    setFiles((prev) => ({ ...prev, [champ]: file }));
  };

  const resetForm = () => {
    setForm(FORM_VIDE);
    setFiles({});
    setResoumettreId(null);
  };

  const openCorriger = (demande) => {
    setResoumettreId(demande.id);
    setForm({ type_assurance: demande.type_assurance });
    setFiles({});
    setFormError('');
    setFormSuccess('');
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError('');
    setFormSuccess('');
    try {
      const formData = new FormData();
      formData.append('type_assurance', form.type_assurance);
      Object.entries(files).forEach(([champ, file]) => {
        if (file) formData.append(champ, file);
      });
      const url = resoumettreId ? `/demandes/${resoumettreId}/resoumettre/` : '/demandes/create/';
      const response = await api.post(url, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setFormSuccess(response.data.message || 'Demande envoyée avec succès');
      resetForm();
      onRefresh();
      setTimeout(() => setFormSuccess(''), 4000);
    } catch (err) {
      setFormError(extraireMessageErreur(err, "Erreur lors de l'envoi de la demande. Vérifiez les documents fournis."));
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <DashboardLayout
      title="Demander un contrat"
      subtitle="Envoyez une demande avec vos documents, la compagnie la traite ensuite"
    >
      <Card ref={formRef} className="mb-6">
        <h3 className="font-semibold text-neutral-800 mb-1">
          {resoumettreId ? 'Corriger et renvoyer la demande' : 'Nouvelle demande'}
        </h3>
        <p className="text-sm text-neutral-500 mb-4">
          Choisissez le type d'assurance souhaité, les documents demandés s'affichent automatiquement.
        </p>

        {formError && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{formError}</div>
        )}
        {formSuccess && (
          <div className="mb-4 rounded-lg bg-secondary-50 p-3 text-sm text-secondary-700">{formSuccess}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            id="type_assurance"
            label="Type d'assurance"
            name="type_assurance"
            value={form.type_assurance}
            onChange={handleTypeChange}
            required
          >
            <option value="">Choisir le type</option>
            {TYPES_ASSURANCE.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </Select>

          {documentsRequis.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {documentsRequis.map((doc) => (
                <Input
                  key={doc.champ}
                  id={doc.champ}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  label={doc.label}
                  required={doc.requis === true}
                  hint={doc.requis === 'un_de' ? 'Ou le document suivant, au moins un des deux' : 'PDF, JPG ou PNG — 5 Mo max'}
                  onChange={(e) => handleFileChange(doc.champ, e.target.files[0])}
                />
              ))}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            {resoumettreId && (
              <Button type="button" variant="ghost" className="bg-neutral-100" onClick={resetForm}>
                Annuler la correction
              </Button>
            )}
            <Button type="submit" loading={formLoading} disabled={!form.type_assurance}>
              {formLoading ? 'Envoi...' : resoumettreId ? 'Renvoyer la demande' : 'Envoyer la demande'}
            </Button>
          </div>
        </form>
      </Card>

      <Card>
        <h3 className="font-semibold text-neutral-800 mb-4">Historique de mes demandes</h3>

        {loading && <div className="py-8 text-center text-neutral-400">Chargement...</div>}
        {error && <p className="text-sm text-red-600">{error}</p>}

        {!loading && !error && demandes.length === 0 && (
          <div className="py-8 text-center text-neutral-400">
            <IconInbox className="mx-auto mb-3 h-10 w-10 text-neutral-300" />
            <p>Aucune demande envoyée pour l'instant.</p>
          </div>
        )}

        <div className="space-y-3">
          {demandes.map((demande) => (
            <div key={demande.id} className="rounded-xl border border-neutral-100 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <h4 className="font-bold text-neutral-800">{demande.numero_demande}</h4>
                    <Badge variant={DEMANDE_STATUS_VARIANTS[demande.statut] || 'neutral'}>
                      {demande.statut_display}
                    </Badge>
                  </div>
                  <p className="text-sm text-neutral-500 mt-1">{demande.type_assurance_display}</p>
                  <p className="text-xs text-neutral-400 mt-1">
                    Envoyée le {new Date(demande.date_demande).toLocaleDateString('fr-FR')}
                  </p>
                  {demande.statut === 'REJETEE' && demande.motif_rejet && (
                    <p className="text-sm text-red-600 mt-2 italic">Motif du rejet : {demande.motif_rejet}</p>
                  )}
                  {demande.statut === 'VALIDEE' && demande.contrat && (
                    <p className="text-sm text-secondary-700 mt-2">
                      Contrat créé : {demande.contrat.numero_contrat}
                    </p>
                  )}
                </div>
                {demande.statut === 'REJETEE' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openCorriger(demande)}
                    className="flex-shrink-0"
                  >
                    <IconRefresh className="h-4 w-4" />
                    Corriger et renvoyer
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </DashboardLayout>
  );
}

// ---------------------------------------------------------------------------
// Espace compagnie : liste + traitement (valider / rejeter)
// ---------------------------------------------------------------------------

function VueCompagnie({ demandes, loading, error, filtre, setFiltre, onRefresh }) {
  const [selectedDemande, setSelectedDemande] = useState(null);
  const [adminAction, setAdminAction] = useState(null);
  const [validerForm, setValiderForm] = useState({ date_debut: '', date_fin: '', montant_prime: '', description: '' });
  const [rejeterForm, setRejeterForm] = useState({ motif_rejet: '' });
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');

  const openDetail = (demande) => {
    setSelectedDemande(demande);
    setAdminAction(null);
    setActionError('');
    setValiderForm({ date_debut: '', date_fin: '', montant_prime: '', description: '' });
    setRejeterForm({ motif_rejet: '' });
  };

  const closeDetail = () => setSelectedDemande(null);

  const handleValider = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setActionError('');
    try {
      await api.post(`/demandes/${selectedDemande.id}/valider/`, validerForm);
      setSelectedDemande(null);
      onRefresh();
    } catch (err) {
      setActionError(extraireMessageErreur(err, 'Erreur lors de la validation.'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejeter = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setActionError('');
    try {
      await api.post(`/demandes/${selectedDemande.id}/rejeter/`, rejeterForm);
      setSelectedDemande(null);
      onRefresh();
    } catch (err) {
      setActionError(extraireMessageErreur(err, 'Erreur lors du rejet.'));
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <DashboardLayout title="Demandes de contrat" subtitle="Traitez les demandes envoyées par vos clients">
      <div className="flex gap-2 mb-6 flex-wrap">
        {FILTRES_ADMIN.map((f) => (
          <button
            key={f}
            onClick={() => setFiltre(f)}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
              filtre === f ? 'bg-primary-600 text-white' : 'bg-white text-neutral-600 shadow-card hover:bg-neutral-50'
            }`}
          >
            {FILTRE_LABELS[f]}
          </button>
        ))}
      </div>

      {loading && <div className="py-12 text-center text-neutral-400">Chargement...</div>}

      {error && (
        <Card padding="sm" className="mb-4 border border-red-100 bg-red-50">
          <p className="text-sm text-red-600">{error}</p>
        </Card>
      )}

      {!loading && !error && demandes.length === 0 && (
        <Card padding="lg" className="text-center text-neutral-400">
          <IconInbox className="mx-auto mb-3 h-10 w-10 text-neutral-300" />
          <p>Aucune demande dans cette catégorie.</p>
        </Card>
      )}

      <div className="grid gap-4">
        {demandes.map((demande) => (
          <Card key={demande.id} hoverable>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-1 flex-wrap">
                  <h3 className="font-bold text-neutral-800 text-lg">{demande.numero_demande}</h3>
                  <Badge variant={DEMANDE_STATUS_VARIANTS[demande.statut] || 'neutral'}>
                    {demande.statut_display}
                  </Badge>
                </div>
                <p className="text-sm text-neutral-500">
                  {demande.client?.user?.prenom} {demande.client?.user?.nom}
                </p>
                <p className="text-sm text-neutral-500">{demande.type_assurance_display}</p>
                <p className="text-xs text-neutral-400 mt-1">
                  Envoyée le {new Date(demande.date_demande).toLocaleDateString('fr-FR')}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => openDetail(demande)}>
                Voir le détail
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {selectedDemande && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/50 p-4">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-card-hover">
            <div className="flex items-center justify-between rounded-t-2xl bg-primary-600 px-6 py-4">
              <h3 className="text-lg font-bold text-white">Demande {selectedDemande.numero_demande}</h3>
              <button
                onClick={closeDetail}
                className="rounded-lg p-1 text-white/80 hover:bg-white/10 hover:text-white"
                aria-label="Fermer"
              >
                <IconClose className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 p-6">
              {actionError && (
                <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{actionError}</div>
              )}

              <Card padding="sm" className="bg-neutral-50 text-sm text-neutral-600">
                <p>
                  <strong>Client :</strong> {selectedDemande.client?.user?.prenom} {selectedDemande.client?.user?.nom}
                  {' — '}{selectedDemande.client?.user?.email}
                </p>
                <p><strong>Type d'assurance :</strong> {selectedDemande.type_assurance_display}</p>
                <p>
                  <strong>Envoyée le :</strong>{' '}
                  {new Date(selectedDemande.date_demande).toLocaleDateString('fr-FR')}
                </p>
              </Card>

              <div>
                <p className="mb-2 text-sm font-medium text-neutral-700">Documents fournis</p>
                {selectedDemande.documents.length === 0 ? (
                  <p className="text-sm text-neutral-400">Aucun document.</p>
                ) : (
                  <div className="space-y-2">
                    {selectedDemande.documents.map((doc) => (
                      <a
                        key={doc.id}
                        href={doc.fichier}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 rounded-lg bg-secondary-50 px-3 py-2 text-sm font-medium text-secondary-700 hover:bg-secondary-100"
                      >
                        <IconDownload className="h-4 w-4" />
                        {doc.type_document_display}
                      </a>
                    ))}
                  </div>
                )}
              </div>

              {selectedDemande.statut === 'REJETEE' && (
                <p className="text-sm text-red-600 italic">Motif du rejet : {selectedDemande.motif_rejet}</p>
              )}
              {selectedDemande.statut === 'VALIDEE' && selectedDemande.contrat && (
                <p className="text-sm text-secondary-700">
                  Contrat créé : {selectedDemande.contrat.numero_contrat}
                </p>
              )}

              {selectedDemande.statut === 'EN_ATTENTE' && (
                <>
                  {!adminAction && (
                    <div className="flex gap-3 pt-2">
                      <Button variant="danger" fullWidth onClick={() => setAdminAction('rejeter')}>
                        Rejeter
                      </Button>
                      <Button fullWidth onClick={() => setAdminAction('valider')}>
                        Valider
                      </Button>
                    </div>
                  )}

                  {adminAction === 'valider' && (
                    <form onSubmit={handleValider} className="space-y-4 border-t border-neutral-100 pt-4">
                      <div className="grid grid-cols-2 gap-4">
                        <Input
                          id="date_debut"
                          label="Date de début"
                          type="date"
                          value={validerForm.date_debut}
                          onChange={(e) => setValiderForm({ ...validerForm, date_debut: e.target.value })}
                          required
                        />
                        <Input
                          id="date_fin"
                          label="Date de fin"
                          type="date"
                          value={validerForm.date_fin}
                          onChange={(e) => setValiderForm({ ...validerForm, date_fin: e.target.value })}
                          required
                        />
                      </div>
                      <Input
                        id="montant_prime"
                        label="Montant de la prime (FCFA)"
                        type="number"
                        value={validerForm.montant_prime}
                        onChange={(e) => setValiderForm({ ...validerForm, montant_prime: e.target.value })}
                        placeholder="Ex: 150000"
                        required
                      />
                      <Textarea
                        id="description"
                        label="Description (optionnel)"
                        rows={2}
                        value={validerForm.description}
                        onChange={(e) => setValiderForm({ ...validerForm, description: e.target.value })}
                      />
                      <div className="flex gap-3">
                        <Button type="button" variant="ghost" fullWidth className="bg-neutral-100" onClick={() => setAdminAction(null)}>
                          Retour
                        </Button>
                        <Button type="submit" fullWidth loading={actionLoading}>
                          Créer le contrat
                        </Button>
                      </div>
                    </form>
                  )}

                  {adminAction === 'rejeter' && (
                    <form onSubmit={handleRejeter} className="space-y-4 border-t border-neutral-100 pt-4">
                      <Textarea
                        id="motif_rejet"
                        label="Motif du rejet"
                        rows={3}
                        value={rejeterForm.motif_rejet}
                        onChange={(e) => setRejeterForm({ motif_rejet: e.target.value })}
                        placeholder="Expliquez pourquoi la demande est rejetée..."
                        required
                      />
                      <div className="flex gap-3">
                        <Button type="button" variant="ghost" fullWidth className="bg-neutral-100" onClick={() => setAdminAction(null)}>
                          Retour
                        </Button>
                        <Button type="submit" variant="danger" fullWidth loading={actionLoading} disabled={!rejeterForm.motif_rejet}>
                          Confirmer le rejet
                        </Button>
                      </div>
                    </form>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

export default Demandes;
