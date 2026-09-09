import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/logo-nia.png';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { IconShield, IconFileText, IconCreditCard } from '../components/ui/icons';

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

      {/* Panneau gauche — image de marque */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary-600 flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/10" />
        <div className="absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-white/5" />

        <div className="relative flex items-center gap-3">
          <img src={logo} alt="NIA Assurance" className="h-14 w-14 rounded-xl bg-white/95 p-1.5 object-contain" />
          <span className="text-white font-bold text-lg tracking-wide">NIA ASSURANCE</span>
        </div>

        <div className="relative text-white">
          <h1 className="text-3xl font-bold leading-snug mb-3">
            Votre partenaire de confiance, chaque jour.
          </h1>
          <p className="text-white/85 text-base mb-10 max-w-sm">
            Gérez vos contrats, vos sinistres et vos paiements depuis un espace
            simple, sécurisé et disponible à tout moment.
          </p>

          <ul className="space-y-4">
            {highlights.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-sm">
                <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-white/15">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="text-white/90">{text}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative flex gap-2">
          <div className="h-1.5 w-10 rounded-full bg-white" />
          <div className="h-1.5 w-10 rounded-full bg-white/40" />
          <div className="h-1.5 w-10 rounded-full bg-secondary-500" />
        </div>
      </div>

      {/* Panneau droit — formulaire */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md">

          {/* Logo mobile */}
          <div className="text-center mb-8 lg:hidden">
            <img src={logo} alt="NIA Assurance" className="h-16 w-16 mx-auto mb-3 object-contain" />
            <span className="text-xl font-bold text-neutral-800">NIA ASSURANCE</span>
          </div>

          <h2 className="text-3xl font-bold text-neutral-800 mb-2">Connexion</h2>
          <p className="text-neutral-500 mb-8">Bienvenue ! Connectez-vous à votre espace</p>

          {error && (
            <Card padding="sm" className="mb-4 border border-red-100 bg-red-50">
              <p className="text-sm text-red-600">{error}</p>
            </Card>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              id="email"
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="votre@email.com"
              required
            />

            <Input
              id="password"
              label="Mot de passe"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />

            <Button type="submit" variant="primary" size="lg" fullWidth loading={loading}>
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

          <p className="text-center text-xs text-neutral-400 mt-8">
            © {new Date().getFullYear()} Nia Assurance — Tous droits réservés
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
