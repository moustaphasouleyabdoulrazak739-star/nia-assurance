import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const STATUT_COLORS = {
  ACTIF: 'bg-niger-vert_light text-niger-vert',
  EXPIRE: 'bg-gray-100 text-gray-500',
  SUSPENDU: 'bg-orange-100 text-orange-600',
  RESILIE: 'bg-red-100 text-red-600',
};

const Contrats = () => {
  const { user } = useAuth();
  const [contrats, setContrats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filtre, setFiltre] = useState('TOUS');

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'AGENT';

  useEffect(() => {
    fetchContrats();
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

  const contratsFiltres = filtre === 'TOUS'
    ? contrats
    : contrats.filter(c => c.statut === filtre);

  return (
    <div className="min-h-screen bg-gray-100">

      <nav className="bg-niger-orange text-white px-6 py-4 flex justify-between items-center shadow-lg">
        <h1 className="text-xl font-bold">NIA ASSURANCE</h1>
        <span className="text-sm">{user?.prenom} {user?.nom}</span>
      </nav>

      <div className="max-w-6xl mx-auto p-6">

        <div className="bg-white rounded-2xl shadow p-6 mb-6 border-l-4 border-niger-orange flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-niger-orange">Mes Contrats</h2>
            <p className="text-gray-500 mt-1">Vos contrats en cours</p>
          </div>
          {isAdmin && (
            <button className="bg-niger-orange text-white px-5 py-2 rounded-xl font-medium">
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
                  <p className="text-gray-500 text-sm">{contrat.type_assurance}</p>
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
                    <button className="bg-niger-orange_light text-niger-orange px-3 py-1 rounded-lg text-xs font-medium block mt-2">
                      Modifier
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
};

export default Contrats;