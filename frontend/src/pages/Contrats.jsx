import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const STATUT_COLORS = {
  ACTIF: 'bg-niger-vert_light text-niger-vert',
  EXPIRE: 'bg-gray-100 text-gray-500',
  SUSPENDU: 'bg-orange-100 text-orange-600',
  RESILIE: 'bg-red-100 text-red-600',
};

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

  useEffect(() => {
    fetchContrats();
    if (isAdmin) fetchClients();
  }, []);

  const fetchContrats = async () => {
    try {
      setLoading(true);
      const response = await api.get('/contrats/');
      setContrats(response.data);
    } catch (err) {
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
        setFormSuccess('Contrat modifie avec succes !');
      } else {
        await api.post('/contrats/create/', form);
        setFormSuccess('Contrat cree avec succes !');
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
        : 'Erreur lors de l\'enregistrement. Verifiez les informations.';
      setFormError(message);
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">

      <nav className="bg-niger-orange text-white px-6 py-4 flex justify-between items-center shadow-lg">
        <h1 className="text-xl font-bold">NIA ASSURANCE</h1>
        <span className="text-sm">{user?.prenom} {user?.nom}</span>
      </nav>

      <div className="max-w-6xl mx-auto p-6">

        <div className="bg-white rounded-2xl shadow p-6 mb-6 border-l-4 border-niger-orange flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-niger-orange">
              {isAdmin ? 'Contrats' : 'Mes Contrats'}
            </h2>
            <p className="text-gray-500 mt-1">
              {isAdmin ? 'Tous les contrats clients' : 'Vos contrats en cours'}
            </p>
          </div>
          {isAdmin && (
            <button
              onClick={openCreate}
              className="bg-niger-orange text-white px-5 py-2 rounded-xl font-medium hover:bg-niger-orange_dark transition"
            >
              Nouveau contrat
            </button>
          )}
        </div>

        <div className="flex gap-2 mb-6 flex-wrap">
          {['TOUS', 'ACTIF', 'EXPIRE', 'SUSPENDU', 'RESILIE'].map(f => (
            <button
              key={f}
              onClick={() => setFiltre(f)}
              className={filtre === f ? 'px-4 py-2 rounded-xl text-sm font-medium bg-niger-orange text-white' : 'px-4 py-2 rounded-xl text-sm font-medium bg-white text-gray-600'}
            >
              {f}
            </button>
          ))}
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

        {!loading && !error && contratsFiltres.length === 0 && (
          <div className="bg-white rounded-2xl shadow p-12 text-center text-gray-400">
            <p>Aucun contrat trouve.</p>
          </div>
        )}

        <div className="grid gap-4">
          {contratsFiltres.map(contrat => (
            <div key={contrat.id} className="bg-white rounded-2xl shadow p-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-gray-800 text-lg">
                    {contrat.numero_contrat}
                  </h3>
                  {isAdmin && (
                    <p className="text-gray-400 text-xs mt-1">
                      {contrat.client?.user?.prenom} {contrat.client?.user?.nom}
                    </p>
                  )}
                  <p className="text-gray-500 text-sm">{contrat.type_assurance_display || contrat.type_assurance}</p>
                  <p className="text-gray-400 text-xs mt-1">
                    Du {contrat.date_debut} au {contrat.date_fin}
                  </p>
                  <span className={STATUT_COLORS[contrat.statut] + ' text-xs px-3 py-1 rounded-full font-medium inline-block mt-2'}>
                    {contrat.statut}
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-niger-orange">
                    {Number(contrat.montant_prime).toLocaleString()} FCFA
                  </p>
                  {contrat.document && (
                    <a
                      href={'http://127.0.0.1:8000' + contrat.document}
                      target="_blank"
                      rel="noreferrer"
                      className="bg-niger-vert_light text-niger-vert px-3 py-1 rounded-lg text-xs font-medium inline-block mt-2"
                    >
                      Telecharger PDF
                    </a>
                  )}
                  {isAdmin && (
                    <button
                      onClick={() => openEdit(contrat)}
                      className="bg-niger-orange_light text-niger-orange px-3 py-1 rounded-lg text-xs font-medium block mt-2 ml-auto"
                    >
                      Modifier
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>

      {/* Modal creation / edition */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">

            <div className="bg-niger-orange text-white px-6 py-4 rounded-t-2xl flex justify-between items-center">
              <h3 className="text-lg font-bold">
                {editingId ? 'Modifier le contrat' : 'Nouveau contrat'}
              </h3>
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
                  Client
                </label>
                <select
                  name="client"
                  value={form.client}
                  onChange={handleChange}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-niger-orange"
                  required
                >
                  <option value="">Choisir un client</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.user?.prenom} {c.user?.nom} — {c.cin || 'CIN non renseigne'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type d'assurance
                </label>
                <select
                  name="type_assurance"
                  value={form.type_assurance}
                  onChange={handleChange}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-niger-orange"
                  required
                >
                  <option value="">Choisir le type</option>
                  <option value="AUTO">Assurance Auto</option>
                  <option value="SANTE">Assurance Sante</option>
                  <option value="HABITATION">Assurance Habitation</option>
                  <option value="VIE">Assurance Vie</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date de debut
                  </label>
                  <input
                    type="date"
                    name="date_debut"
                    value={form.date_debut}
                    onChange={handleChange}
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-niger-orange"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date de fin
                  </label>
                  <input
                    type="date"
                    name="date_fin"
                    value={form.date_fin}
                    onChange={handleChange}
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-niger-orange"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Montant de la prime (FCFA)
                </label>
                <input
                  type="number"
                  name="montant_prime"
                  value={form.montant_prime}
                  onChange={handleChange}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-niger-orange"
                  placeholder="Ex: 150000"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Statut
                </label>
                <select
                  name="statut"
                  value={form.statut}
                  onChange={handleChange}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-niger-orange"
                >
                  <option value="ACTIF">Actif</option>
                  <option value="EXPIRE">Expire</option>
                  <option value="SUSPENDU">Suspendu</option>
                  <option value="RESILIE">Resilie</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  rows={2}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-niger-orange"
                  placeholder="Notes internes (optionnel)"
                />
              </div>

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
                  disabled={formLoading}
                  className="flex-1 bg-niger-orange hover:bg-niger-orange_dark text-white py-3 rounded-xl font-medium transition"
                >
                  {formLoading ? 'Envoi...' : editingId ? 'Enregistrer' : 'Creer'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default Contrats;
