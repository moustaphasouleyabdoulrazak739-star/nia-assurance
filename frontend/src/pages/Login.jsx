import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { IconMail, IconLock } from '../components/ui/icons';
import { messageErreurConnexion } from '../utils/loginErrors';
import heroImage from '../assets/login-hero.jpg';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(messageErreurConnexion(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-white">

      {/* Panneau gauche — image de marque : photo + overlay de marque.
          `hidden lg:flex` -> disparaît entièrement sous le breakpoint lg,
          le formulaire occupe alors toute la largeur (pas de bande écrasée). */}
      <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between overflow-hidden p-12">
        <img
          src={heroImage}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
        {/* Voile uni pour la lisibilite du texte blanc sur la photo. */}
        <div className="absolute inset-0 bg-neutral-900/55" />

        <div className="relative z-10 flex items-center gap-3">
          <img
            src="/logo-nia.png"
            alt="NIA Assurance"
            className="h-20 w-20 rounded-lg bg-white p-2 object-contain"
          />
          <span className="text-xl font-bold tracking-wide text-white">NIA ASSURANCE</span>
        </div>
      </div>

      {/* Panneau droit — formulaire, centré verticalement */}
      <div className="relative flex w-full min-w-0 flex-1 items-center justify-center overflow-hidden bg-white px-8 py-12">
        <div className="relative w-full min-w-0 max-w-md">

          {/* Logo mobile */}
          <div className="text-center mb-8 lg:hidden">
            <img src="/logo-nia.png" alt="NIA Assurance" className="h-16 w-16 mx-auto mb-3 object-contain" />
            <span className="text-xl font-bold text-neutral-800">NIA ASSURANCE</span>
          </div>

          <h2 className="font-display text-3xl font-bold text-neutral-800 mb-10">Connexion</h2>

          {error && (
            <Card padding="sm" className="mb-4 border border-red-100 bg-red-50">
              <p className="text-sm text-red-600">{error}</p>
            </Card>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              id="email"
              label="Email"
              type="email"
              icon={IconMail}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="votre@email.com"
              required
            />

            <div>
              <Input
                id="password"
                label="Mot de passe"
                type="password"
                icon={IconLock}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
              <div className="mt-1.5 text-right">
                <Link
                  to="/mot-de-passe-oublie"
                  className="text-xs font-medium text-neutral-500 hover:text-primary-600"
                >
                  Mot de passe oublié ?
                </Link>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              loading={loading}
            >
              {loading ? 'Connexion...' : 'Se connecter'}
            </Button>

            <Button
              type="button"
              variant="outline"
              size="lg"
              fullWidth
              onClick={() => navigate('/register')}
            >
              Créer un compte
            </Button>
          </form>

          <p className="text-center text-xs text-neutral-400 mt-10">
            © {new Date().getFullYear()} NIA Assurance. Tous droits réservés.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
