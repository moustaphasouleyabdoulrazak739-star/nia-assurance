import { Link } from 'react-router-dom';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { IconMail } from '../components/ui/icons';

/**
 * Page de secours pour le lien "Mot de passe oublié" du formulaire de
 * connexion — le flux de réinitialisation par email n'existe pas encore
 * côté backend, donc plutôt qu'un lien mort (404) ou un href="#" inerte, on
 * assume honnêtement l'état actuel en orientant vers l'agence.
 */
export default function MotDePasseOublie() {
  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary-50 shadow-sm">
          <img src="/logo-nia.png" alt="NIA Assurance" className="h-14 w-14 object-contain" />
        </div>

        <Card padding="lg">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary-50 text-primary-600">
            <IconMail className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-bold text-neutral-800 mb-2">Mot de passe oublié</h1>
          <p className="text-sm text-neutral-500 mb-6">
            La réinitialisation en ligne n'est pas encore disponible. Contactez votre
            agence NIA Assurance avec votre numéro de client, un conseiller réinitialisera
            votre accès rapidement.
          </p>
          <Link to="/login">
            <Button variant="outline" fullWidth>Retour à la connexion</Button>
          </Link>
        </Card>
      </div>
    </div>
  );
}
