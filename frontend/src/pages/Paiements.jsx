import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const STATUT_COLORS = {
  EN_ATTENTE: 'bg-orange-100 text-orange-600',
  VALIDE: 'bg-niger-vert_light text-niger-vert',
  ECHOUE: 'bg-red-100 text-red-600',
  REMBOURSE: 'bg-gray-100 text-gray-500',
};

const METHODE_LABELS = {
  MYNITA: 'MyNITA',
  AMANATA: 'AmanaTa',
  ESPECES: 'Especes',
  VIREMENT: 'Virement bancaire',
};

const Paiements = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [paiements, setPaiements] = useState([]);
  const [contrats, setContrats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [form, setForm] = useState({
    contrat: '',
    montant: '',
    methode: '',
    reference: '',
  });

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'AGENT';
  const showTelephone = form.methode === 'MYNITA' || form.methode === 'AMANATA';

  useEffect(() => {
    fetchPaiements();
    fetchContrats();
  }, []);

  const fetchPaiements = async () => {
    try {
      setLoading(true);
      const response = await api.get('/paiements/');
      setPaiements(response.data);
    } catch (err) {
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

  const handleChange = (e) => {
    const { name, value } = e.target;

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
    try {
      await api.post('/paiements/create/', form);
      setFormSuccess('Paiement effectue avec succes !');
      setForm({ contrat: '', montant: '', methode: '', reference: '' });
      fetchPaiements();
      setTimeout(() => {
        setShowModal(false);
        setFormSuccess('');
      }, 2000);
    } catch (err) {
      setFormError('Erreur lors du paiement. Verifiez les informations.');
    } finally {
      setFormLoading(false);
    }
  };

  const openModal = () => {
    setForm({ contrat: '', montant: '', methode: '', reference: '' });
    setFormError('');
    setFormSuccess('');
    setShowModal(true);
  };

  return (
    <div className="min-h-screen bg-gray-100">

      <nav className="bg-niger-orange text-white px-6 py-4 flex justify-between items-center shadow-lg">
        <h1 className="text-xl font-bold">NIA ASSURANCE</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm">{user?.prenom} {user?.nom}</span>
          <button
            onClick={() => navigate('/dashboard')}
            className="bg-white text-niger-orange px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-100 transition"
          >
            Tableau de bord
          </button>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto p-6">

        <div className="bg-white rounded-2xl shadow p-6 mb-6 border-l-4 border-niger-orange flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-niger-orange">Mes Paiements</h2>
            <p className="text-gray-500 mt-1">
              {isAdmin ? 'Liste de tous les paiements' : 'Historique de vos paiements'}
            </p>
          </div>
          <button
            onClick={openModal}
            className="bg-niger-orange hover:bg-niger-orange_dark text-white px-5 py-2 rounded-xl font-medium transition"
          >
            Effectuer un paiement
          </button>
        </div>

        {loading && (
          <div className="text-center py-12 text-gray-400">
            Chargement...
          </div>
        )}

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-200 mb-4">
            {error}
          </div>
        )}

        {!loading && !error && paiements.length === 0 && (
          <div className="bg-white rounded-2xl shadow p-12 text-center text-gray-400">
            <p className="text-4xl mb-4">💳</p>
            <p>Aucun paiement effectue.</p>
            <button
              onClick={openModal}
              className="mt-4 bg-niger-orange text-white px-5 py-2 rounded-xl font-medium"
            >
              Effectuer mon premier paiement
            </button>
          </div>
        )}

        <div className="grid gap-4">
          {paiements.map(paiement => (
            <div key={paiement.id} className="bg-white rounded-2xl shadow p-6">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-bold text-gray-800 text-lg">
                      {paiement.numero_recu}
                    </h3>
                    <span className={STATUT_COLORS[paiement.statut] + ' text-xs px-3 py-1 rounded-full font-medium'}>
                      {paiement.statut}
                    </span>
                  </div>
                  <p className="text-gray-500 text-sm">
                    Methode : {METHODE_LABELS[paiement.methode]}
                  </p>
                  <p className="text-gray-400 text-xs mt-1">
                    Contrat : {paiement.contrat}
                  </p>
                  <p className="text-gray-400 text-xs mt-1">
                    Date : {new Date(paiement.date_paiement).toLocaleDateString('fr-FR')}
                  </p>
                  {paiement.reference && (
                    <p className="text-gray-400 text-xs mt-1">
                      Reference : {paiement.reference}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-niger-orange">
                    {Number(paiement.montant).toLocaleString()} FCFA
                  </p>
                  <p className="text-gray-400 text-xs">Montant paye</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex gap-1 justify-center">
          <div className="w-8 h-2 bg-niger-orange rounded"></div>
          <div className="w-8 h-2 bg-white border border-gray-200 rounded"></div>
          <div className="w-8 h-2 bg-niger-vert rounded"></div>
        </div>

      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">

            <div className="bg-niger-orange text-white px-6 py-4 rounded-t-2xl flex justify-between items-center">
              <h3 className="text-lg font-bold">Effectuer un paiement</h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-white hover:text-gray-200 text-xl font-bold"
              >
                X
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">

              {formError && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm border border-red-200">
                  {formError}
                </div>
              )}

              {formSuccess && (
                <div className="bg-niger-vert_light text-niger-vert p-3 rounded-lg text-sm border border-green-200">
                  {formSuccess}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contrat a payer
                </label>
                <select
                  name="contrat"
                  value={form.contrat}
                  onChange={handleChange}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-niger-orange"
                  required
                >
                  <option value="">Choisir un contrat</option>
                  {contrats.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.numero_contrat} - {c.type_assurance}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Montant (FCFA)
                </label>
                <input
                  type="number"
                  name="montant"
                  value={form.montant}
                  onChange={handleChange}
                  className="w-full border-2 border-niger-orange_light rounded-xl px-4 py-3 focus:outline-none focus:border-niger-orange bg-niger-orange_light"
                  placeholder="Selectionner un contrat"
                  readOnly
                />
                <p className="text-xs text-gray-400 mt-1">
                  Montant automatiquement rempli depuis la prime du contrat
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Methode de paiement
                </label>
                <select
                  name="methode"
                  value={form.methode}
                  onChange={handleChange}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-niger-orange"
                  required
                >
                  <option value="">Choisir la methode</option>
                  <option value="MYNITA">MyNITA</option>
                  <option value="AMANATA">AmanaTa</option>
                  <option value="ESPECES">Especes</option>
                  <option value="VIREMENT">Virement bancaire</option>
                </select>
              </div>

              {showTelephone && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Numero de telephone {form.methode === 'MYNITA' ? 'MyNITA' : 'AmanaTa'}
                  </label>
                  <input
                    type="tel"
                    name="reference"
                    value={form.reference}
                    onChange={handleChange}
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-niger-orange"
                    placeholder="Ex: 96000000"
                    required
                  />
                </div>
              )}

              {!showTelephone && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reference (optionnel)
                  </label>
                  <input
                    type="text"
                    name="reference"
                    value={form.reference}
                    onChange={handleChange}
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-niger-orange"
                    placeholder="Reference du virement ou recu"
                  />
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-gray-100 text-gray-600 py-3 rounded-xl font-medium hover:bg-gray-200 transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={formLoading || !form.montant}
                  className="flex-1 bg-niger-orange hover:bg-niger-orange_dark text-white py-3 rounded-xl font-medium transition"
                >
                  {formLoading ? 'Envoi...' : 'Payer'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default Paiements;