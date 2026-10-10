# PixelDoc Atelier

Application web interne (PWA, sans serveur ni dépendance) : réparations, stock de pièces, devis, factures et documents légaux.
**Les données restent dans le `localStorage` du navigateur** : aucune donnée client ne doit jamais être ajoutée au dépôt
(les données de démonstration de `js/seed.js` sont fictives).

## Organisation

| Fichier | Rôle |
|---|---|
| `index.html`, `css/style.css` | Structure et styles |
| `js/calc.js` | **Calculs de montants purs** (centimes, TVA, remises, totaux) — testés |
| `js/docs-core.js` | **Numérotation continue et contrôle des mentions obligatoires** — testés |
| `js/backup-core.js` | **Format de sauvegarde, empreinte, validation, migration** — testés |
| `js/*.js` (autres) | Écrans et accès au navigateur ; scripts classiques chargés dans l'ordre d'`index.html` |
| `sw.js` | Service worker (hors ligne). **Incrémenter `VERSION` à chaque modification d'un fichier de l'appli.** |

## Tests

```
npm test                                   # tests unitaires (Node ≥ 20, aucune dépendance)
[PD_PIN=…] node tests/smoke.mjs http://localhost:8080/   # navigateur : chargement + parcours des pages
[PD_PIN=…] node tests/e2e.mjs   http://localhost:8080/   # navigateur : TVA, factures, sauvegarde/restauration
```
Les tests navigateur demandent Playwright (global) et un serveur statique (`python3 -m http.server 8080`).

## TVA

Le régime est un **paramètre du Profil** (aucun choix par défaut) : franchise en base (art. 293 B CGI) ou assujetti.
Taux normal à La Réunion : 8,5 % (réduit 2,1 %) — art. 296 CGI, voir
<https://www.impots.gouv.fr/professionnel/questions/quels-sont-les-differents-taux-de-tva-applicables-dans-les-dom>.

## Code PIN

Aucun code par défaut : au premier lancement, l'utilisateur crée son code. Il est stocké haché (PBKDF2). **Ce n'est qu'un verrou d'écran** : les données restent lisibles dans le navigateur (DevTools) par quiconque a accès à l'appareil.
