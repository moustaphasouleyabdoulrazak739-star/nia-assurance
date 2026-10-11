// Message distinct pour un 429 (throttling backend, cf. users/views.py) :
// ne doit jamais se confondre avec "mot de passe incorrect", sous peine de
// faire croire a l'utilisateur que son mot de passe a change. Utilise le
// delai indique par le serveur (en-tete Retry-After) quand il est present.
//
// Extrait de pages/Login.jsx dans son propre module pour etre teste sans
// avoir a importer toute la page (voir loginErrors.test.js).
export function messageErreurConnexion(err) {
  if (err.response?.status === 429) {
    const secondes = parseInt(err.response.headers?.['retry-after'], 10);
    if (Number.isFinite(secondes) && secondes > 0) {
      if (secondes < 60) {
        return `Trop de tentatives. Réessayez dans ${secondes} secondes.`;
      }
      const minutes = Math.ceil(secondes / 60);
      return `Trop de tentatives. Réessayez dans ${minutes} minute${minutes > 1 ? 's' : ''}.`;
    }
    return 'Trop de tentatives. Réessayez dans une minute.';
  }
  return 'Email ou mot de passe incorrect';
}
