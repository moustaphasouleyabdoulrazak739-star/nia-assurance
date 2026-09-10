import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import DashboardLayout from '../components/layout/DashboardLayout';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { Input, Select, Textarea } from '../components/ui/Input';
import { IconFileText, IconClock, IconLock, IconPhone } from '../components/ui/icons';

function extraireMessageErreur(err, messageParDefaut) {
  const data = err.response?.data;
  if (data?.error) return data.error;
  if (data && typeof data === 'object') {
    return Object.values(data)
      .map((v) => (Array.isArray(v) ? v.join(' ') : v))
      .join(' ');
  }
  return messageParDefaut;
}

const Profil = () => {
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [contratsActifs, setContratsActifs] = useState(null);
  const [form, setForm] = useState({
    cin: '',
    date_naissance: '',
    sexe: '',
    adresse: '',
    ville: '',
    profession: '',
    telephone: user?.telephone || '',
  });

  // Mot de passe : formulaire et etat entierement separes de celui du
  // profil ci-dessus (endpoint different, semantique differente - un ancien
  // mot de passe errone ne doit pas empecher de sauvegarder le reste).
  const [pwForm, setPwForm] = useState({ old_password: '', new_password: '', new_password2: '' });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');

  const fetchProfil = async () => {
    try {
      setLoading(true);
      const response = await api.get('/clients/me/');
      const data = response.data;
      setForm((prev) => ({
        ...prev,
        cin: data.cin || '',
        date_naissance: data.date_naissance || '',
        sexe: data.sexe || '',
        adresse: data.adresse || '',
        ville: data.ville || '',
        profession: data.profession || '',
      }));
      if (data.photo) {
        setPhotoPreview(data.photo);
      }
    } catch {
      setError('Impossible de charger le profil.');
    } finally {
      setLoading(false);
    }
  };

  const fetchContratsActifs = async () => {
    try {
      const response = await api.get('/contrats/');
      setContratsActifs(response.data.filter((c) => c.statut === 'ACTIF').length);
    } catch {
      // Recapitulatif indicatif uniquement : la page reste utilisable sans.
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchProfil();
    fetchContratsActifs();
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
      const [, profileRes] = await Promise.all([
        api.patch('/clients/me/', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        }),
        api.patch('/auth/profile/', { telephone: form.telephone }),
      ]);
      updateUser(profileRes.data);
      setSuccess('Profil mis à jour avec succès !');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(extraireMessageErreur(err, 'Erreur lors de la mise à jour du profil.'));
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = (e) => {
    setPwForm({ ...pwForm, [e.target.name]: e.target.value });
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPwError('');
    setPwSuccess('');
    if (pwForm.new_password !== pwForm.new_password2) {
      setPwError('Les nouveaux mots de passe ne correspondent pas.');
      return;
    }
    setPwSaving(true);
    try {
      await api.post('/auth/change-password/', {
        old_password: pwForm.old_password,
        new_password: pwForm.new_password,
      });
      setPwSuccess('Mot de passe modifié avec succès !');
      setPwForm({ old_password: '', new_password: '', new_password2: '' });
      setTimeout(() => setPwSuccess(''), 3000);
    } catch (err) {
      setPwError(extraireMessageErreur(err, 'Erreur lors du changement de mot de passe.'));
    } finally {
      setPwSaving(false);
    }
  };

  const membreDepuis = user?.date_creation
    ? new Date(user.date_creation).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long' })
    : null;

  return (
    <DashboardLayout title="Mon profil" subtitle="Gérez vos informations personnelles">
      {loading && (
        <div className="py-12 text-center text-neutral-400">Chargement...</div>
      )}

      {!loading && (
        <div className="space-y-6">

          {/* Récapitulatif */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card className="flex items-center gap-4">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
                <IconFileText className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-neutral-500">Contrats actifs</p>
                <p className="text-2xl font-bold text-neutral-800">
                  {contratsActifs === null ? '—' : contratsActifs}
                </p>
              </div>
            </Card>
            <Card className="flex items-center gap-4">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-secondary-50 text-secondary-700">
                <IconClock className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-neutral-500">Membre depuis</p>
                <p className="text-lg font-bold text-neutral-800">{membreDepuis || '—'}</p>
              </div>
            </Card>
          </div>

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

          {/* Formulaire profil */}
          <form onSubmit={handleSubmit} className="space-y-6">

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
                <Input
                  id="userEmail"
                  label="Email"
                  type="email"
                  value={user?.email || ''}
                  readOnly
                  className="bg-neutral-50 text-neutral-400"
                  hint="Identifiant de connexion — contactez la compagnie pour le modifier"
                />

                <Input
                  id="telephone"
                  label="Téléphone"
                  name="telephone"
                  type="tel"
                  icon={IconPhone}
                  value={form.telephone}
                  onChange={handleChange}
                  placeholder="Ex: 96000000"
                />

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

            <Button type="submit" size="lg" fullWidth loading={saving} className="text-lg">
              {saving ? 'Sauvegarde en cours...' : 'Sauvegarder les modifications'}
            </Button>
          </form>

          {/* Changer le mot de passe */}
          <Card as="form" onSubmit={handlePasswordSubmit}>
            <h3 className="text-lg font-bold text-neutral-700 mb-1">Mot de passe</h3>
            <p className="text-sm text-neutral-500 mb-4">
              Choisissez un mot de passe d'au moins 8 caractères.
            </p>

            {pwError && (
              <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{pwError}</div>
            )}
            {pwSuccess && (
              <div className="mb-4 rounded-lg bg-secondary-50 p-3 text-sm text-secondary-700">{pwSuccess}</div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                id="old_password"
                label="Mot de passe actuel"
                name="old_password"
                type="password"
                icon={IconLock}
                value={pwForm.old_password}
                onChange={handlePasswordChange}
                required
              />
              <Input
                id="new_password"
                label="Nouveau mot de passe"
                name="new_password"
                type="password"
                icon={IconLock}
                value={pwForm.new_password}
                onChange={handlePasswordChange}
                placeholder="Min. 8 caractères"
                required
              />
              <Input
                id="new_password2"
                label="Confirmer le nouveau"
                name="new_password2"
                type="password"
                icon={IconLock}
                value={pwForm.new_password2}
                onChange={handlePasswordChange}
                required
              />
            </div>

            <Button type="submit" variant="outline" loading={pwSaving} className="mt-4">
              {pwSaving ? 'Modification...' : 'Modifier le mot de passe'}
            </Button>
          </Card>

        </div>
      )}
    </DashboardLayout>
  );
};

export default Profil;
