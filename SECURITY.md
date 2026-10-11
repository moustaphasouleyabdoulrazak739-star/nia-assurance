# Politique de sécurité — NIA Assurance

Ce document liste les risques de dépendances **identifiés et acceptés
consciemment**, pour que le pipeline CI (`.github/workflows/ci.yml`) reste
vert sans masquer l'historique de la décision. Toute vulnérabilité qui
n'apparaît pas ci-dessous doit faire échouer le pipeline — c'est la règle,
pas l'exception.

## Backend (pip-audit)

**Aucun risque accepté.** `pip-audit -r requirements.txt` doit rester
strictement vert. Si une vulnérabilité apparaît, la dépendance concernée
doit être mise à jour avant de merger, pas documentée ici.

## Frontend (npm audit)

Le pipeline exécute `npm audit --omit=dev` : seules les dépendances de
**production** (celles réellement livrées au navigateur) peuvent faire
échouer le build. Les dépendances de développement (outillage de build)
ne sont jamais vérifiées dans ce pipeline, par choix — voir ci-dessous.

| Paquet / chaîne | Gravité | Pourquoi accepté | Date | À réévaluer |
|---|---|---|---|---|
| `vite` (≤6.4.2, via `esbuild`) | moyenne | Corrigé par Vite 6/7/8, changement majeur non testé. N'affecte que le serveur de développement local, jamais le bundle de production livré. | 2026-10-09 | Avant la prochaine montée de version majeure de Vite planifiée. |
| `tailwindcss` (≤3.4.19) et sa chaîne (`chokidar`, `braces`, `micromatch`, `fast-glob`, `postcss-nested`, `postcss-selector-parser`) | moyenne/élevée | Corrigé par Tailwind 4, changement majeur (nouvelle syntaxe de config) non testé. Outillage de build uniquement, jamais livré au navigateur. | 2026-10-09 | Avant la migration vers Tailwind 4. |

Ces paquets sont tous dans `devDependencies` (vérifié : `npm audit
--omit=dev` renvoie 0 vulnérabilité à la date ci-dessus). `axios` et
`react-router`/`react-router-dom`, qui sont eux livrés au navigateur, ont
été corrigés dès l'audit initial et n'ont pas de risque accepté.

## Mobile (npm audit)

Expo ne sépare pas outillage et code embarqué de la même façon qu'un
projet web : la chaîne Metro/Expo CLI vit dans `dependencies`, pas
`devDependencies`. `--omit=dev` ne suffit donc pas ; le pipeline utilise
`mobile/scripts/check-audit-policy.mjs`, qui filtre par **nom de paquet**
(plus stable qu'un chemin de dépendances, qui change à chaque mise à jour
de lockfile) et échoue sur tout paquet vulnérable absent de la liste
ci-dessous.

| Paquet / chaîne | Gravité | Pourquoi accepté | Date | À réévaluer |
|---|---|---|---|---|
| `expo`, `@expo/cli`, `@expo/config`, `@expo/config-plugins`, `@expo/inline-modules`, `@expo/local-build-cache-provider`, `@expo/metro`, `@expo/metro-config`, `@expo/prebuild-config`, `metro`, `metro-config`, `metro-file-map`, `metro-transform-worker`, `braces`, `micromatch`, `@react-native/community-cli-plugin`, `@react-native/virtualized-lists`, `react-native`, `@react-native-community/datetimepicker`, `uuid`, `xcode`, `expo-sharing` | élevée | Corrigé uniquement par Expo 44 (changement majeur de SDK, non testé avec le code actuel). Tourne côté outillage de développement (Metro, CLI) au moment du build, jamais dans l'app installée sur le téléphone. | 2026-10-09 | Avant la migration vers Expo SDK 44+. |
| `@expo/code-signing-certificates`, `node-forge` | élevée | Même chaîne Expo 44. `node-forge` sert à la signature de code pour les mises à jour OTA, pas utilisé par ce projet (pas de canal OTA configuré). | 2026-10-09 | Idem. |

`shell-quote` (critique), `query-string` et `decode-uri-component`,
présents dans l'audit initial, ont été corrigés par `npm audit fix` (sans
`--force`) et n'ont pas de risque accepté.

## Secrets (gitleaks)

Le pipeline fait tourner gitleaks sur l'historique complet, avec une règle
propre au projet (`.gitleaks.toml`) qui détecte toute `SECRET_KEY` Django
codée en dur ou toute valeur `django-insecure-*`, que les règles par défaut
de gitleaks ne repèrent pas (entropie trop faible).

**Exception documentée :** le commit initial `c6e1e8a26bc383a0f5ff158b1545f6d7ce8583a9`
contient une valeur par défaut `django-insecure-*` codée en dur dans
`nia_assurance/settings.py` (volontairement non reproduite ici en toutes
lettres, pour ne pas faire déclencher cette même règle sur ce fichier).
Cette clé a été **rotée** (changée) le 2026-10-10 — voir l'historique des
commits de sécurité — et n'a plus aucune valeur pour un attaquant qui la
lirait dans l'historique public. Elle est exclue du pipeline par SHA de
commit exact dans `.gitleaks.toml` (`[allowlist] commits = [...]`), avec
le même commentaire. Toute autre occurrence, dans ce commit ou un autre,
continue de faire échouer le pipeline.

## Signaler une vulnérabilité

Projet pédagogique sans canal de signalement dédié à ce stade : ouvrir une
issue sur le dépôt GitHub en évitant d'y détailler publiquement un exploit
non corrigé.
