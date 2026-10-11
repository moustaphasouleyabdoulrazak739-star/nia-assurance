// Regression de l'audit DevSecOps : un mauvais mot de passe sur
// /auth/login/ (401, sans jeton en jeu) etait traite comme un jeton
// expire -> tentative de rafraichissement -> echec -> deconnexion qui
// rechargeait la page de connexion et effacait le formulaire. Ces tests
// exercent le VRAI module (pas une reimplementation) via axios-mock-
// adapter, sans toucher au reseau.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import api from './api.js';

const REFRESH_PATH = '/auth/token/refresh/';
const ROUTES_SANS_RAFRAICHISSEMENT = ['/auth/login/', '/auth/register/', '/auth/logout/', REFRESH_PATH];

function makeLocalStorage() {
  let store = {};
  return {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
    clear: () => { store = {}; },
  };
}

// Une seule instance de `api` (et de l'axios global qu'il utilise en
// interne pour l'appel de refresh) pour tout le fichier : les fonctions de
// l'intercepteur lisent localStorage/window au moment de l'appel, pas a
// l'import, donc remplacer les stubs globaux a chaque test suffit a les
// isoler - pas besoin de reimporter le module (ce qui, avec axios importe
// separement ici, desynchroniserait l'instance mockee de celle utilisee
// par api.js).
let apiMock;
let axiosMock;

beforeEach(() => {
  vi.stubGlobal('localStorage', makeLocalStorage());
  vi.stubGlobal('window', { location: { href: '/page-actuelle' } });
  apiMock = new MockAdapter(api);
  axiosMock = new MockAdapter(axios);
});

afterEach(() => {
  apiMock.restore();
  axiosMock.restore();
  vi.unstubAllGlobals();
});

describe.each(ROUTES_SANS_RAFRAICHISSEMENT)('401 sur %s', (route) => {
  it('ne declenche ni rafraichissement ni deconnexion', async () => {
    apiMock.onPost(route).reply(401, { error: 'Email ou mot de passe incorrect' });

    await expect(api.post(route, {})).rejects.toMatchObject({ response: { status: 401 } });

    expect(axiosMock.history.post).toHaveLength(0); // aucun appel refresh
    expect(window.location.href).toBe('/page-actuelle'); // pas de redirection
  });
});

describe('401 sur une route protegee sans jeton d\'acces', () => {
  it('ne declenche ni rafraichissement ni deconnexion (rien a rafraichir)', async () => {
    // localStorage vide au depart (voir makeLocalStorage) : la requete
    // part donc sans en-tete Authorization.
    apiMock.onGet('/clients/me/').reply(401, { detail: 'Informations d\'authentification non fournies.' });

    await expect(api.get('/clients/me/')).rejects.toMatchObject({ response: { status: 401 } });

    expect(axiosMock.history.post).toHaveLength(0);
    expect(window.location.href).toBe('/page-actuelle');
  });
});

describe('401 sur une route protegee AVEC jeton (vraie expiration)', () => {
  it('rafraichit une seule fois puis rejoue la requete d\'origine', async () => {
    localStorage.setItem('access_token', 'ancien-access');
    localStorage.setItem('refresh_token', 'un-refresh-valide');

    apiMock.onGet('/clients/me/').replyOnce(401, { detail: 'jeton expire' });
    apiMock.onGet('/clients/me/').reply((config) => {
      // La requete rejouee doit porter le NOUVEAU jeton.
      if (config.headers.Authorization !== 'Bearer nouveau-access') {
        return [401, { detail: 'toujours le vieux jeton' }];
      }
      return [200, { id: 42 }];
    });
    axiosMock.onPost(`http://127.0.0.1:8000/api${REFRESH_PATH}`).reply(200, { access: 'nouveau-access', refresh: 'nouveau-refresh' });

    const response = await api.get('/clients/me/');

    expect(response.data).toEqual({ id: 42 });
    expect(axiosMock.history.post).toHaveLength(1); // un seul appel de refresh
    expect(axiosMock.history.post[0].url).toBe(`http://127.0.0.1:8000/api${REFRESH_PATH}`);
    expect(localStorage.getItem('access_token')).toBe('nouveau-access');
    expect(localStorage.getItem('refresh_token')).toBe('nouveau-refresh');
    expect(window.location.href).toBe('/page-actuelle'); // pas de deconnexion
  });

  it('se deconnecte si le rafraichissement echoue aussi', async () => {
    localStorage.setItem('access_token', 'ancien-access');
    localStorage.setItem('refresh_token', 'un-refresh-invalide');

    apiMock.onGet('/clients/me/').reply(401, { detail: 'jeton expire' });
    axiosMock.onPost(`http://127.0.0.1:8000/api${REFRESH_PATH}`).reply(401, { detail: 'Token is invalid' });

    await expect(api.get('/clients/me/')).rejects.toBeTruthy();

    expect(window.location.href).toBe('/login'); // deconnexion/redirection, comportement inchange
    expect(localStorage.getItem('access_token')).toBeNull();
  });

  it('plusieurs requetes en echec simultane ne declenchent qu\'un seul rafraichissement', async () => {
    localStorage.setItem('access_token', 'ancien-access');
    localStorage.setItem('refresh_token', 'un-refresh-valide');

    apiMock.onGet('/contrats/').replyOnce(401);
    apiMock.onGet('/contrats/').reply(200, []);
    apiMock.onGet('/sinistres/').replyOnce(401);
    apiMock.onGet('/sinistres/').reply(200, []);
    axiosMock.onPost(`http://127.0.0.1:8000/api${REFRESH_PATH}`).reply(200, { access: 'nouveau-access', refresh: 'nouveau-refresh' });

    const [r1, r2] = await Promise.all([api.get('/contrats/'), api.get('/sinistres/')]);

    expect(axiosMock.history.post).toHaveLength(1); // verrou refreshPromise partage
    expect(r1.data).toEqual([]);
    expect(r2.data).toEqual([]);
  });
});
