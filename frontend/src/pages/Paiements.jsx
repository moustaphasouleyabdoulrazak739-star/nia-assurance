import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import DashboardLayout from '../components/layout/DashboardLayout';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { Select, Input, ChampVerrouille } from '../components/ui/Input';
import { PAIEMENT_STATUS_VARIANTS } from '../components/ui/statusVariants';
import { telechargerPdf, extraireErreurTelechargement } from '../utils/downloadPdf';
import { extraireErreursChamps } from '../utils/erreursChamps';
import { formaterMontant } from '../utils/format';
import {
  idsContratsEnAttente,
  libelleMontant,
  marquerContratEnAttente,
  messageTropDeTentatives,
} from '../utils/paiements';
import { IconClose, IconInbox, IconCreditCard, IconDownload, IconLock } from '../components/ui/icons';

const METHODE_LABELS = {
  MYNITA: 'MyNITA',
  AMANATA: 'AmanaTa',
  ESPECES: 'Espèces',
  VIREMENT: 'Virement bancaire',
};

const Paiements = () => {
  const { user } = useAuth();
  const [paiements, setPaiements] = useState([]);
  const [contrats, setContrats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  // Erreurs de validation renvoyees par l'API, affichees sous chaque champ
  // (ex. "montant" different de la prime, telephone MyNITA/AmanaTa invalide).
  const [erreursChamps, setErreursChamps] = useState({});
  const [form, setForm] = useState({
    contrat: '',
    montant: '',
    methode: '',
    reference: '',
  });
  const [updatingId, setUpdatingId] = useState(null);
  const [recuEnCoursId, setRecuEnCoursId] = useState(null);
  const [recuError, setRecuError] = useState('');

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'AGENT';
  const showTelephone = form.methode === 'MYNITA' || form.methode === 'AMANATA';

  const fetchPaiements = async () => {
    try {
      setLoading(true);
      const response = await api.get('/paiements/');
      setPaiements(response.data);
    } catch {
      setError('Impossible de charger les paiements.');
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
    fetchPaiements();
    fetchContrats();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;

    // Un champ modifie perd son erreur ; changer de contrat recalcule le
    // montant, changer de methode change la nature de la reference.
    const effaces = { contrat: ['contrat', 'montant'], methode: ['methode', 'reference'] }[name] || [name];
    setErreursChamps((prev) => {
      const suivant = { ...prev };
      effaces.forEach((champ) => delete suivant[champ]);
      return suivant;
    });

    if (name === 'contrat') {
      const contratChoisi = contrats.find(c => String(c.id) === String(value));
      setForm({
        ...form,
        contrat: value,
        montant: contratChoisi ? contratChoisi.montant_prime : '',
      });
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError('');
    setFormSuccess('');
    setErreursChamps({});
    try {
      await api.post('/paiements/create/', form);
      setFormSuccess('Paiement effectué avec succès !');
      setForm({ contrat: '', montant: '', methode: '', reference: '' });
      fetchPaiements();
      setTimeout(() => {
        setShowModal(false);
        setFormSuccess('');
      }, 2000);
    } catch (err) {
      // 429 : throttle de creation (5/min), message clair plutot que le
      // texte DRF.
      const tropDeTentatives = messageTropDeTentatives(err);
      if (tropDeTentatives) {
        setFormError(tropDeTentatives);
        return;
      }
      const { champs, general } = extraireErreursChamps(err);
      setErreursChamps(champs);
      if (general) {
        setFormError(general);
      } else if (Object.keys(champs).length > 0) {
        setFormError('Certaines informations sont invalides, voir ci-dessous.');
      } else {
        setFormError('Erreur lors du paiement. Vérifiez les informations.');
      }
    } finally {
      setFormLoading(false);
    }
  };

  const openModal = () => {
    setForm({ contrat: '', montant: '', methode: '', reference: '' });
    setFormError('');
    setFormSuccess('');
    setErreursChamps({});
    setShowModal(true);
  };

  const handleStatutChange = async (paiementId, statut) => {
    setUpdatingId(paiementId);
    try {
      await api.patch(`/paiements/${paiementId}/`, { statut });
      fetchPaiements();
    } catch {
      setError('Impossible de mettre à jour ce paiement.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDownloadRecu = async (paiement) => {
    setRecuEnCoursId(paiement.id);
    setRecuError('');
    try {
      await telechargerPdf(api, `/paiements/${paiement.id}/recu/`, `recu_${paiement.numero_recu}.pdf`);
    } catch (err) {
      setRecuError(await extraireErreurTelechargement(err, 'Impossible de télécharger le reçu.'));
    } finally {
      setRecuEnCoursId(null);
    }
  };

  // Contrats deja payes et en attente de validation : signales dans la
  // liste, le serveur refuse un second paiement en attente.
  const contratsEnAttente = idsContratsEnAttente(paiements);

  const totalPaye = paiements
    .filter((p) => p.statut === 'VALIDE')
    .reduce((somme, p) => somme + Number(p.montant), 0);

  return (
    <DashboardLayout
      title={isAdmin ? 'Paiements' : 'Mes paiements'}
      subtitle={isAdmin ? 'Liste de tous les paiements' : 'Historique de vos paiements'}
      actions={<Button onClick={openModal}>Effectuer un paiement</Button>}
    >
      {loading && (
        <div className="py-12 text-center text-neutral-400">Chargement...</div>
      )}

      {!loading && !error && paiements.length > 0 && (
        <Card hoverable className="mb-6 flex items-center gap-4">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-secondary-50 text-secondary-700">
            <IconCreditCard className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm text-neutral-500">
              {isAdmin ? 'Total payé (tous clients, paiements validés)' : 'Total payé (paiements validés)'}
            </p>
            <p className="text-2xl font-bold text-neutral-800">{formaterMontant(totalPaye)}</p>
          </div>
        </Card>
      )}

      {error && (
        <Card padding="sm" className="mb-4 border border-red-100 bg-red-50">
          <p className="text-sm text-red-600">{error}</p>
        </Card>
      )}

      {recuError && (
        <Card padding="sm" className="mb-4 border border-red-100 bg-red-50">
          <p className="text-sm text-red-600">{recuError}</p>
        </Card>
      )}

      {!loading && !error && paiements.length === 0 && (
        <Card padding="lg" className="text-center text-neutral-400">
          <IconInbox className="mx-auto mb-3 h-10 w-10 text-neutral-300" />
          <p className="mb-4">Aucun paiement effectué.</p>
          <Button onClick={openModal}>Effectuer mon premier paiement</Button>
        </Card>
      )}

      <div className="grid gap-4">
        {paiements.map(paiement => (
          <Card key={paiement.id} hoverable>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2 flex-wrap">
                  <h3 className="font-bold text-neutral-800 text-lg">
                    {paiement.numero_recu}
                  </h3>
                  <Badge variant={PAIEMENT_STATUS_VARIANTS[paiement.statut] || 'neutral'}>
                    {paiement.statut}
                  </Badge>
                </div>
                <p className="text-neutral-500 text-sm">
                  Méthode : {METHODE_LABELS[paiement.methode]}
                </p>
                <p className="text-neutral-400 text-xs mt-1">
                  Contrat : {paiement.contrat?.numero_contrat}
                  {isAdmin && paiement.client?.user && (
                    <>, {paiement.client.user.prenom} {paiement.client.user.nom}</>
                  )}
                </p>
                <p className="text-neutral-400 text-xs mt-1">
                  Date : {new Date(paiement.date_paiement).toLocaleDateString('fr-FR')}
                </p>
                {paiement.reference && (
                  <p className="text-neutral-400 text-xs mt-1">
                    Référence : {paiement.reference}
                  </p>
                )}
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-primary-600">
                  {formaterMontant(paiement.montant)}
                </p>
                <p className="text-neutral-400 text-xs">{libelleMontant(paiement.statut)}</p>
                {paiement.statut === 'VALIDE' && (
                  <button
                    onClick={() => handleDownloadRecu(paiement)}
                    disabled={recuEnCoursId === paiement.id}
                    className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-secondary-50 px-3 py-1.5 text-xs font-medium text-secondary-700 hover:bg-secondary-100 disabled:opacity-50"
                  >
                    <IconDownload className="h-3.5 w-3.5" />
                    {recuEnCoursId === paiement.id ? 'Génération...' : 'Télécharger le reçu'}
                  </button>
                )}
                {isAdmin && (
                  <select
                    value={paiement.statut}
                    disabled={updatingId === paiement.id}
                    onChange={(e) => handleStatutChange(paiement.id, e.target.value)}
                    className="mt-2 rounded-lg border border-neutral-200 bg-white px-2 py-1.5 text-xs focus:border-primary-400 focus:outline-none focus:ring-4 focus:ring-primary-100"
                  >
                    <option value="EN_ATTENTE">En attente</option>
                    <option value="VALIDE">Validé</option>
                    <option value="ECHOUE">Échoué</option>
                    <option value="REMBOURSE">Remboursé</option>
                  </select>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-card-hover">

            <div className="flex items-center justify-between rounded-t-2xl bg-primary-600 px-6 py-4">
              <h3 className="text-lg font-bold text-white">Effectuer un paiement</h3>
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
                label="Contrat à payer"
                name="contrat"
                value={form.contrat}
                onChange={handleChange}
                error={erreursChamps.contrat}
                required
              >
                <option value="">Choisir un contrat</option>
                {contrats.map(c => (
                  <option key={c.id} value={c.id}>
                    {marquerContratEnAttente(`${c.numero_contrat} - ${c.type_assurance}`, c.id, contratsEnAttente)}
                  </option>
                ))}
              </Select>

              <ChampVerrouille
                id="montant"
                label="Montant"
                value={formaterMontant(form.montant)}
                placeholder="Sélectionner un contrat"
                mention="Fixé par le contrat"
                icon={IconLock}
                hint="Montant égal à la prime du contrat, non modifiable"
                error={erreursChamps.montant}
              />

              <Select
                id="methode"
                label="Méthode de paiement"
                name="methode"
                value={form.methode}
                onChange={handleChange}
                error={erreursChamps.methode}
                required
              >
                <option value="">Choisir la méthode</option>
                <option value="MYNITA">MyNITA</option>
                <option value="AMANATA">AmanaTa</option>
                <option value="ESPECES">Espèces</option>
                <option value="VIREMENT">Virement bancaire</option>
              </Select>

              {showTelephone && (
                <Input
                  id="reference"
                  label={`Numéro de téléphone ${form.methode === 'MYNITA' ? 'MyNITA' : 'AmanaTa'}`}
                  type="tel"
                  name="reference"
                  value={form.reference}
                  onChange={handleChange}
                  placeholder="Ex: 96000000"
                  error={erreursChamps.reference}
                  required
                />
              )}

              {!showTelephone && (
                <Input
                  id="reference"
                  label="Référence (optionnel)"
                  type="text"
                  name="reference"
                  value={form.reference}
                  onChange={handleChange}
                  placeholder="Référence du virement ou reçu"
                  error={erreursChamps.reference}
                />
              )}

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
                <Button type="submit" fullWidth loading={formLoading} disabled={!form.montant}>
                  {formLoading ? 'Envoi...' : 'Payer'}
                </Button>
              </div>

            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default Paiements;
