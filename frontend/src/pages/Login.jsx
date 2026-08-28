import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

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
      setError('Email ou mot de passe incorrect');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">

      {/* Panneau gauche */}
      <div className="hidden lg:flex lg:w-1/2 bg-niger-orange flex-col items-center justify-center p-12">
        <div className="text-white text-center">
          <div className="text-6xl mb-6">🛡️</div>
          <h1 className="text-4xl font-bold mb-4">NIA ASSURANCE</h1>
          <p className="text-xl opacity-90">Votre partenaire de confiance</p>
          <div className="mt-8 flex gap-2 justify-center">
            <div className="w-12 h-2 bg-niger-orange rounded"></div>
            <div className="w-12 h-2 bg-white rounded"></div>
            <div className="w-12 h-2 bg-niger-vert rounded"></div>
          </div>
        </div>
      </div>

      {/* Panneau droit */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md">

          {/* Logo mobile */}
          <div className="text-center mb-8 lg:hidden">
            <div className="text-4xl mb-2">🛡️</div>
            <h1 className="text-2xl font-bold text-niger-orange">NIA ASSURANCE</h1>
          </div>

          <h2 className="text-3xl font-bold text-gray-800 mb-2">Connexion</h2>
          <p className="text-gray-500 mb-8">Bienvenue ! Connectez-vous à votre espace</p>

          {/* Erreur */}
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm border border-red-200">
              ❌ {error}
            </div>
          )}

          {/* Formulaire */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-niger-orange transition"
                placeholder="votre@email.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mot de passe
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-niger-orange transition"
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-niger-orange hover:bg-niger-orange_dark text-white font-semibold py-3 rounded-xl transition duration-200 text-lg"
            >
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>

            <button
              type="button"
              onClick={() => navigate('/register')}
              className="w-full bg-niger-vert hover:bg-niger-vert_dark text-white font-semibold py-3 rounded-xl transition duration-200 text-lg"
            >
              Créer un compte
            </button>
          </form>

          {/* Drapeau */}
          <div className="mt-8 flex gap-1 justify-center">
            <div className="w-8 h-2 bg-niger-orange rounded"></div>
            <div className="w-8 h-2 bg-white border border-gray-200 rounded"></div>
            <div className="w-8 h-2 bg-niger-vert rounded"></div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Login;