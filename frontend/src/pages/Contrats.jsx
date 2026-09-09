import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import DashboardLayout from '../components/layout/DashboardLayout';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { Select, Textarea, Input } from '../components/ui/Input';
import { CONTRAT_STATUS_VARIANTS } from '../components/ui/statusVariants';
import { IconClose, IconDownload, IconInbox } from '../components/ui/icons';

const FILTRES = ['TOUS', 'ACTIF', 'EXPIRE', 'SUSPENDU', 'RESILIE'];

const FORM_VIDE = {
  client: '',
  type_assurance: '',
  date_debut: '',
  date_fin: '',
  montant_prime: '',
  statut: 'ACTIF',
  description: '',
};

const Contrats = () => {
  const { user } = useAuth();
  const [contrats, setContrats] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filtre, setFiltre] = useState('TOUS');

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(FORM_VIDE);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

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

  const fetchClients = async () => {
    try {
      const response = await api.get('/clients/');
      setClients(response.data);
    } catch (err) {
      console.error('Erreur clients', err);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchContrats();
    if (isAdmin) fetchClients();
  }, [isAdmin]);

  const contratsFiltres = filtre === 'TOUS'
    ? contrats
    : contrats.filter(c => c.statut === filtre);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(FORM_VIDE);
    setFormError('');
    setShowModal(true);
  };

  const openEdit = (contrat) => {
    setEditingId(contrat.id);
    setForm({
      client: contrat.client?.id ?? '',
      type_assurance: contrat.type_assurance,
      date_debut: contrat.date_debut,
      date_fin: contrat.date_fin,
      montant_prime: contrat.montant_prime,
      statut: contrat.statut,
      description: contrat.description || '',
    });
    setFormError('');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError('');
    setFormSuccess('');
    try {
      if (editingId) {
        await api.patch(`/contrats/${editingId}/`, form);
        setFormSuccess('Contrat modifié avec succès !');
      } else {
        await api.post('/contrats/create/', form);
        setFormSuccess('Contrat créé avec succès !');
      }
      fetchContrats();
      setTimeout(() => {
        setShowModal(false);
        setFormSuccess('');
      }, 1500);
    } catch (err) {
      const data = err.response?.data;
      const message = data && typeof data === 'object'
        ? Object.values(data).flat().join(' ')
        : "Erreur lors de l'enregistrement. Vérifiez les informations.";
      setFormError(message);
    } finally {
      setFormLoading(false);
    }
  };

  const clientHint = `Un client au profil incomplet doit d'abord renseigner CIN, date de naissance, adresse et ville depuis "Mon profil".`;

  return (
    <DashboardLayout
      title={isAdmin ? 'Contrats' : 'Mes contrats'}
      subtitle={isAdmin ? 'Tous les contrats clients' : 'Vos contrats en cours'}
      actions={isAdmin && <Button onClick={openCreate}>Nouveau contrat</Button>}
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
                {isAdmin && (
                  <p className="text-neutral-400 text-xs mt-1">
                    {contrat.client?.user?.prenom} {contrat.client?.user?.nom}
                  </p>
                )}
                <p className="text-neutral-500 text-sm">{contrat.type_assurance_display || contrat.type_assurance}</p>
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
                      href={contrat.document}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg bg-secondary-50 px-3 py-1.5 text-xs font-medium text-secondary-700 hover:bg-secondary-100"
                    >
                      <IconDownload className="h-3.5 w-3.5" />
                      Télécharger PDF
                    </a>
                  )}
                  {isAdmin && (
                    <button
                      onClick={() => openEdit(contrat)}
                      className="rounded-lg bg-primary-50 px-3 py-1.5 text-xs font-medium text-primary-700 hover:bg-primary-100"
                    >
                      Modifier
                    </button>
                  )}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Modal création / édition */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/50 p-4">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-card-hover">

            <div className="flex items-center justify-between rounded-t-2xl bg-primary-600 px-6 py-4">
              <h3 className="text-lg font-bold text-white">
                {editingId ? 'Modifier le contrat' : 'Nouveau contrat'}
              </h3>
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
                id="client"
                label="Client"
                name="client"
                value={form.client}
                onChange={handleChange}
                hint={clientHint}
                required
              >
                <option value="">Choisir un client</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.user?.prenom} {c.user?.nom}
                    {c.profil_complet ? ` — ${c.cin}` : ' — profil incomplet'}
                  </option>
                ))}
              </Select>

              <Select
                id="type_assurance"
                label="Type d'assurance"
                name="type_assurance"
                value={form.type_assurance}
                onChange={handleChange}
                required
              >
                <option value="">Choisir le type</option>
                <option value="AUTO">Assurance Auto</option>
                <option value="SANTE">Assurance Santé</option>
                <option value="HABITATION">Assurance Habitation</option>
                <option value="VIE">Assurance Vie</option>
              </Select>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  id="date_debut"
                  label="Date de début"
                  type="date"
                  name="date_debut"
                  value={form.date_debut}
                  onChange={handleChange}
                  required
                />
                <Input
                  id="date_fin"
                  label="Date de fin"
                  type="date"
                  name="date_fin"
                  value={form.date_fin}
                  onChange={handleChange}
                  required
                />
              </div>

              <Input
                id="montant_prime"
                label="Montant de la prime (FCFA)"
                type="number"
                name="montant_prime"
                value={form.montant_prime}
                onChange={handleChange}
                placeholder="Ex: 150000"
                required
              />

              <Select
                id="statut"
                label="Statut"
                name="statut"
                value={form.statut}
                onChange={handleChange}
              >
                <option value="ACTIF">Actif</option>
                <option value="EXPIRE">Expiré</option>
                <option value="SUSPENDU">Suspendu</option>
                <option value="RESILIE">Résilié</option>
              </Select>

              <Textarea
                id="description"
                label="Description"
                name="description"
                value={form.description}
                onChange={handleChange}
                rows={2}
                placeholder="Notes internes (optionnel)"
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
                <Button type="submit" fullWidth loading={formLoading}>
                  {formLoading ? 'Envoi...' : editingId ? 'Enregistrer' : 'Créer'}
                </Button>
              </div>

            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default Contrats;
