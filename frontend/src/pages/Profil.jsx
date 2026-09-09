import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import DashboardLayout from '../components/layout/DashboardLayout';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { Input, Select, Textarea } from '../components/ui/Input';

const Profil = () => {
  const { user } = useAuth();
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
    } catch {
      setError('Impossible de charger le profil.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfil();
  }, []);

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
      setSuccess('Profil mis à jour avec succès !');
      setTimeout(() => setSuccess(''), 3000);
    } catch {
      setError('Erreur lors de la mise à jour du profil.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout title="Mon profil" subtitle="Gérez vos informations personnelles">
      {loading && (
        <div className="py-12 text-center text-neutral-400">Chargement...</div>
      )}

      {!loading && (
        <form onSubmit={handleSubmit} className="space-y-6">

          {error && (
            <Card padding="sm" className="border border-red-100 bg-red-50">
              <p className="text-sm text-red-600">{error}</p>
            </Card>
          )}

          {success && (
            <Card padding="sm" className="border border-secondary-100 bg-secondary-50">
              <p className="text-sm text-secondary-700">{success}</p>
            </Card>
          )}

          {/* Photo de profil */}
          <Card>
            <h3 className="text-lg font-bold text-neutral-700 mb-4">Photo de profil</h3>
            <div className="flex items-center gap-6">
              <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-4 border-primary-100 bg-primary-50">
                {photoPreview ? (
                  <img
                    src={photoPreview}
                    alt="Photo de profil"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-3xl text-primary-600">
                    {user?.prenom?.charAt(0)}{user?.nom?.charAt(0)}
                  </span>
                )}
              </div>
              <div>
                <label className="inline-block cursor-pointer rounded-xl bg-primary-600 px-4 py-2.5 font-medium text-white transition hover:bg-primary-700">
                  Changer la photo
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhoto}
                    className="hidden"
                  />
                </label>
                <p className="text-neutral-400 text-xs mt-2">JPG, PNG — Max 2MB</p>
              </div>
            </div>
          </Card>

          {/* Informations personnelles */}
          <Card>
            <h3 className="text-lg font-bold text-neutral-700 mb-4">Informations personnelles</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              <Input id="prenom" label="Prénom" value={user?.prenom || ''} readOnly className="bg-neutral-50 text-neutral-400" />
              <Input id="nom" label="Nom" value={user?.nom || ''} readOnly className="bg-neutral-50 text-neutral-400" />
              <Input id="userEmail" label="Email" type="email" value={user?.email || ''} readOnly className="bg-neutral-50 text-neutral-400" />

              <Input
                id="cin"
                label="CIN"
                name="cin"
                value={form.cin}
                onChange={handleChange}
                placeholder="Votre numéro CIN"
                required
              />

              <Input
                id="date_naissance"
                label="Date de naissance"
                type="date"
                name="date_naissance"
                value={form.date_naissance}
                onChange={handleChange}
                required
              />

              <Select
                id="sexe"
                label="Sexe"
                name="sexe"
                value={form.sexe}
                onChange={handleChange}
                required
              >
                <option value="">Choisir</option>
                <option value="M">Masculin</option>
                <option value="F">Féminin</option>
              </Select>

              <Input
                id="ville"
                label="Ville"
                name="ville"
                value={form.ville}
                onChange={handleChange}
                placeholder="Ex: Niamey"
                required
              />

              <Input
                id="profession"
                label="Profession"
                name="profession"
                value={form.profession}
                onChange={handleChange}
                placeholder="Ex: Enseignant"
              />

              <div className="md:col-span-2">
                <Textarea
                  id="adresse"
                  label="Adresse"
                  name="adresse"
                  value={form.adresse}
                  onChange={handleChange}
                  rows={3}
                  placeholder="Votre adresse complète"
                  required
                />
              </div>

            </div>
          </Card>

          {/* Bouton sauvegarder */}
          <Button type="submit" size="lg" fullWidth loading={saving} className="text-lg">
            {saving ? 'Sauvegarde en cours...' : 'Sauvegarder les modifications'}
          </Button>

        </form>
      )}
    </DashboardLayout>
  );
};

export default Profil;
