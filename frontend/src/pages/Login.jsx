import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import BackgroundPattern from '../components/ui/BackgroundPattern';
import { Input } from '../components/ui/Input';
import { IconShield, IconFileText, IconCreditCard, IconMail, IconLock, IconCheckCircle } from '../components/ui/icons';
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
    } catch {
      setError('Email ou mot de passe incorrect');
    } finally {
      setLoading(false);
    }
  };

  const highlights = [
    { icon: IconShield, text: 'Contrats et garanties toujours à portée de main' },
    { icon: IconFileText, text: 'Déclarez un sinistre en quelques clics' },
    { icon: IconCreditCard, text: 'Suivez vos paiements en toute transparence' },
  ];

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
        {/* Overlay degrade de marque : garde l'identite orange tout en
            laissant deviner la photo (humanite) plutot que de la masquer. */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary-900/80 via-primary-700/40 to-primary-700/20" />
        <BackgroundPattern className="text-white/[0.05]" />

        <div className="relative z-10 flex items-center gap-3">
          <img
            src="/logo-nia.png"
            alt="NIA Assurance"
            className="h-20 w-20 rounded-2xl bg-white/95 p-2 object-contain shadow-xl"
          />
          <span className="text-xl font-bold tracking-wide text-white">NIA ASSURANCE</span>
        </div>

        <div className="relative z-10 text-white">
          <h1 className="mb-3 text-3xl font-bold leading-snug drop-shadow-sm">
            Votre partenaire de confiance, chaque jour.
          </h1>
          <p className="mb-10 max-w-sm text-base text-white/90 drop-shadow-sm">
            Gérez vos contrats, vos sinistres et vos paiements depuis un espace
            simple, sécurisé et disponible à tout moment.
          </p>

          <ul className="space-y-3">
            {highlights.map(({ icon: Icon, text }) => (
              <li
                key={text}
                className="flex items-center gap-3 rounded-xl bg-black/25 px-4 py-3 backdrop-blur-sm"
              >
                <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-white/30">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="text-sm text-white/95">{text}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative z-10 flex items-center gap-2 text-xs text-white/80">
          <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-secondary-500">
            <IconCheckCircle className="h-3.5 w-3.5 text-white" />
          </span>
          Protection conforme aux normes du secteur
        </div>
      </div>

      {/* Panneau droit — formulaire, centré verticalement */}
      <div className="relative flex w-full min-w-0 flex-1 items-center justify-center overflow-hidden bg-white px-8 py-12">
        <BackgroundPattern className="hidden text-neutral-900/[0.025] lg:block" />

        <div className="relative w-full min-w-0 max-w-md">

          {/* Logo mobile */}
          <div className="text-center mb-8 lg:hidden">
            <img src="/logo-nia.png" alt="NIA Assurance" className="h-16 w-16 mx-auto mb-3 object-contain" />
            <span className="text-xl font-bold text-neutral-800">NIA ASSURANCE</span>
          </div>

          <h2 className="text-3xl font-bold text-neutral-800 mb-2">Connexion</h2>
          <p className="text-neutral-500 mb-10">Bienvenue ! Connectez-vous à votre espace</p>

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
              className="shadow-lg shadow-primary-600/25 hover:shadow-xl hover:shadow-primary-700/30 hover:-translate-y-0.5 active:translate-y-0 active:shadow-md"
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
            © {new Date().getFullYear()} Nia Assurance — Tous droits réservés
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
