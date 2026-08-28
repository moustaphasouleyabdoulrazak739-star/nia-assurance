import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const Profil = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [form, setForm] = useState({
    cin: '',
    date_naissance: '',
    sexe: '',
    adresse: '',
    ville: '',
    profession: '',
  });

  useEffect(() => {
    fetchProfil();
  }, []);

  const fetchProfil = async () => {
    try {
      setLoading(true);
      const response = await api.get('/clients/me/');
      const data = response.data;
      setForm({
        cin: data.cin || '',
        date_naissance: data.date_naissance || '',
        sexe: data.sexe || '',
        adresse: data.adresse || '',
        ville: data.ville || '',
        profession: data.profession || '',
      });
      if (data.photo) {
        setPhotoPreview('http://127.0.0.1:8000' + data.photo);
      }
    } catch (err) {
      setError('Impossible de charger le profil.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handlePhoto = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const formData = new FormData();
      formData.append('cin', form.cin);
      formData.append('date_naissance', form.date_naissance);
      formData.append('sexe', form.sexe);
      formData.append('adresse', form.adresse);
      formData.append('ville', form.ville);
      formData.append('profession', form.profession);
      if (photoFile) {
        formData.append('photo', photoFile);
      }
      await api.patch('/clients/me/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setSuccess('Profil mis a jour avec succes !');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Erreur lors de la mise a jour du profil.');
    } finally {
      setSaving(false);
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

      <div className="max-w-3xl mx-auto p-6">

        <div className="bg-white rounded-2xl shadow p-6 mb-6 border-l-4 border-niger-vert">
          <h2 className="text-2xl font-bold text-niger-vert">Mon Profil</h2>
          <p className="text-gray-500 mt-1">Gerez vos informations personnelles</p>
        </div>

        {loading && (
          <div className="text-center py-12 text-gray-400">
            Chargement...
          </div>
        )}

        {!loading && (
          <form onSubmit={handleSubmit} className="space-y-6">

            {error && (
              <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-200">
                {error}
              </div>
            )}

            {success && (
              <div className="bg-niger-vert_light text-niger-vert p-4 rounded-xl border border-green-200">
                {success}
              </div>
            )}

            {/* Photo de profil */}
            <div className="bg-white rounded-2xl shadow p-6">
              <h3 className="text-lg font-bold text-gray-700 mb-4">Photo de profil</h3>
              <div className="flex items-center gap-6">
                <div className="w-24 h-24 rounded-full overflow-hidden bg-niger-orange_light flex items-center justify-center border-4 border-niger-orange">
                  {photoPreview ? (
                    <img
                      src={photoPreview}
                      alt="Photo de profil"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-3xl text-niger-orange">
                      {user?.prenom?.charAt(0)}{user?.nom?.charAt(0)}
                    </span>
                  )}
                </div>
                <div>
                  <label className="bg-niger-orange text-white px-4 py-2 rounded-xl font-medium cursor-pointer hover:bg-niger-orange_dark transition">
                    Changer la photo
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhoto}
                      className="hidden"
                    />
                  </label>
                  <p className="text-gray-400 text-xs mt-2">JPG, PNG — Max 2MB</p>
                </div>
              </div>
            </div>

            {/* Informations personnelles */}
            <div className="bg-white rounded-2xl shadow p-6">
              <h3 className="text-lg font-bold text-gray-700 mb-4">Informations personnelles</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Prenom
                  </label>
                  <input
                    type="text"
                    value={user?.prenom || ''}
                    className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 bg-gray-50 text-gray-400"
                    readOnly
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nom
                  </label>
                  <input
                    type="text"
                    value={user?.nom || ''}
                    className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 bg-gray-50 text-gray-400"
                    readOnly
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={user?.email || ''}
                    className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 bg-gray-50 text-gray-400"
                    readOnly
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    CIN
                  </label>
                  <input
                    type="text"
                    name="cin"
                    value={form.cin}
                    onChange={handleChange}
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-niger-vert"
                    placeholder="Votre numero CIN"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date de naissance
                  </label>
                  <input
                    type="date"
                    name="date_naissance"
                    value={form.date_naissance}
                    onChange={handleChange}
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-niger-vert"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sexe
                  </label>
                  <select
                    name="sexe"
                    value={form.sexe}
                    onChange={handleChange}
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-niger-vert"
                    required
                  >
                    <option value="">Choisir</option>
                    <option value="M">Masculin</option>
                    <option value="F">Feminin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ville
                  </label>
                  <input
                    type="text"
                    name="ville"
                    value={form.ville}
                    onChange={handleChange}
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-niger-vert"
                    placeholder="Ex: Niamey"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Profession
                  </label>
                  <input
                    type="text"
                    name="profession"
                    value={form.profession}
                    onChange={handleChange}
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-niger-vert"
                    placeholder="Ex: Enseignant"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Adresse
                  </label>
                  <textarea
                    name="adresse"
                    value={form.adresse}
                    onChange={handleChange}
                    rows={3}
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-niger-vert"
                    placeholder="Votre adresse complete"
                    required
                  />
                </div>

              </div>
            </div>

            {/* Bouton sauvegarder */}
            <button
              type="submit"
              disabled={saving}
              className="w-full bg-niger-vert hover:bg-niger-vert_dark text-white py-4 rounded-xl font-bold text-lg transition"
            >
              {saving ? 'Sauvegarde en cours...' : 'Sauvegarder les modifications'}
            </button>

            {/* Drapeau */}
            <div className="flex gap-1 justify-center pb-4">
              <div className="w-8 h-2 bg-niger-orange rounded"></div>
              <div className="w-8 h-2 bg-white border border-gray-200 rounded"></div>
              <div className="w-8 h-2 bg-niger-vert rounded"></div>
            </div>

          </form>
        )}

      </div>
    </div>
  );
};

export default Profil;