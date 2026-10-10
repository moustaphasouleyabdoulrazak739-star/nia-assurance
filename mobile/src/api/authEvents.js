// Petit pub-sub pour que l'intercepteur axios (mobile/src/api/client.js),
// hors de l'arbre React, puisse declencher une deconnexion visible quand le
// rafraichissement du jeton echoue. AuthProvider s'abonne au montage avec
// setUnauthorizedHandler(logout) ; RootNavigator reagit ensuite normalement
// au passage de `user` a null.
let handler = null;

export function setUnauthorizedHandler(fn) {
  handler = fn;
}

export function notifyUnauthorized() {
  handler?.();
}
