import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const STATUT_COLORS = {
  EN_ATTENTE: 'bg-orange-100 text-orange-600',
  EN_COURS: 'bg-blue-100 text-blue-600',
  APPROUVE: 'bg-niger-vert_light text-niger-vert',
  REJETE: 'bg-red-100 text-red-600',
  REGLE: 'bg-gray-100 text-gray-500',
};

const Sinistres = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
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

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'AGENT';

  useEffect(() => {
    fetchSinistres();
    fetchContrats();
  }, []);

  const fetchSinistres = async () => {
    try {
      setLoading(true);
      const response = await api.get('/sinistres/');
      setSinistres(response.data);
    } catch (err) {
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
      setFormSuccess('Sinistre declare avec succes !');
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
    } catch (err) {
      setFormError('Erreur lors de la declaration. Verifiez les informations.');
    } finally {
      setFormLoading(false);
    }
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

        <div className="bg-white rounded-2xl shadow p-6 mb-6 border-l-4 border-niger-vert flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-niger-vert">Mes Sinistres</h2>
            <p className="text-gray-500 mt-1">
              {isAdmin ? 'Liste de tous les sinistres' : 'Vos declarations de sinistres'}
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="bg-niger-vert hover:bg-niger-vert_dark text-white px-5 py-2 rounded-xl font-medium transition"
          >
            Declarer un sinistre
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

        {!loading && !error && sinistres.length === 0 && (
          <div className="bg-white rounded-2xl shadow p-12 text-center text-gray-400">
            <p className="text-4xl mb-4">📭</p>
            <p>Aucun sinistre declare.</p>
            <button
              onClick={() => setShowModal(true)}
              className="mt-4 bg-niger-vert text-white px-5 py-2 rounded-xl font-medium"
            >
              Declarer mon premier sinistre
            </button>
          </div>
        )}

        <div className="grid gap-4">
          {sinistres.map(sinistre => (
            <div key={sinistre.id} className="bg-white rounded-2xl shadow p-6">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-bold text-gray-800 text-lg">
                      {sinistre.numero_sinistre}
                    </h3>
                    <span className={STATUT_COLORS[sinistre.statut] + ' text-xs px-3 py-1 rounded-full font-medium'}>
                      {sinistre.statut}
                    </span>
                  </div>
                  <p className="text-gray-500 text-sm">{sinistre.type_sinistre}</p>
                  <p className="text-gray-400 text-xs mt-1">
                    Date sinistre : {sinistre.date_sinistre}
                  </p>
                  <p className="text-gray-400 text-xs mt-1">
                    Contrat : {sinistre.contrat}
                  </p>
                  {sinistre.description && (
                    <p className="text-gray-500 text-sm mt-2">{sinistre.description}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-niger-orange">
                    {Number(sinistre.montant_reclame).toLocaleString()} FCFA
                  </p>
                  <p className="text-gray-400 text-xs">Montant reclame</p>
                  {sinistre.montant_indemnite && (
                    <div className="mt-1">
                      <p className="text-lg font-bold text-niger-vert">
                        {Number(sinistre.montant_indemnite).toLocaleString()} FCFA
                      </p>
                      <p className="text-gray-400 text-xs">Indemnite</p>
                    </div>
                  )}
                  {sinistre.document && (
                    <a
                      href={'http://127.0.0.1:8000' + sinistre.document}
                      target="_blank"
                      rel="noreferrer"
                      className="bg-niger-vert_light text-niger-vert px-3 py-1 rounded-lg text-xs font-medium inline-block mt-2"
                    >
                      Telecharger PDF
                    </a>
                  )}
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

            <div className="bg-niger-vert text-white px-6 py-4 rounded-t-2xl flex justify-between items-center">
              <h3 className="text-lg font-bold">Declarer un sinistre</h3>
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
                  Contrat concerne
                </label>
                <select
                  name="contrat"
                  value={form.contrat}
                  onChange={handleChange}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-niger-vert"
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
                  Type de sinistre
                </label>
                <select
                  name="type_sinistre"
                  value={form.type_sinistre}
                  onChange={handleChange}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-niger-vert"
                  required
                >
                  <option value="">Choisir le type</option>
                  <option value="ACCIDENT">Accident</option>
                  <option value="VOL">Vol</option>
                  <option value="INCENDIE">Incendie</option>
                  <option value="MALADIE">Maladie</option>
                  <option value="DECES">Deces</option>
                  <option value="AUTRE">Autre</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date du sinistre
                </label>
                <input
                  type="date"
                  name="date_sinistre"
                  value={form.date_sinistre}
                  onChange={handleChange}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-niger-vert"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  rows={3}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-niger-vert"
                  placeholder="Decrivez le sinistre..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Montant reclame (FCFA)
                </label>
                <input
                  type="number"
                  name="montant_reclame"
                  value={form.montant_reclame}
                  onChange={handleChange}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-niger-vert"
                  placeholder="Ex: 150000"
                  required
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
                  className="flex-1 bg-niger-vert hover:bg-niger-vert_dark text-white py-3 rounded-xl font-medium transition"
                >
                  {formLoading ? 'Envoi...' : 'Declarer'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default Sinistres;