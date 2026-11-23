# CuisineSync — Recettes, Planning & Liste de courses (100 % Autonome, PC & iOS)

Application web progressive (**PWA**) autonome construite avec **React, Express et Firebase Firestore**. Elle fonctionne **24h/24 et 7j/7** sans dépendre d'aucun éditeur en ligne, s'installe comme une vraie application sur **Windows, Mac, iPhone et iPad**, et fonctionne même hors-ligne grâce au cache IndexedDB persistant.

---

## Option 1 (Recommandée) : Déploiement permanent sur Google Cloud Run ou Render (PC + iPad partout)

1. Exportez le projet (**Save to GitHub** ou **Download app** en ZIP) — ou cliquez sur **Deploy** si l'option est affichée dans votre barre d'outils — pour le déployer sur **Google Cloud Run** (projet `gen-lang-client-0730235019`) ou sur **Render.com** (gratuit, via `render.yaml` inclus).
2. Le `Dockerfile` et `npm start` (`node server.ts`) lancent automatiquement le serveur de production autonome.
3. Une fois déployée, vous obtenez votre propre adresse HTTPS permanente (ex. `https://cuisinesync-xxxxx.a.run.app`).
4. **Indispensable pour la synchro Google** : ouvrez **Firebase Console → Authentication → Settings → Authorized domains** et ajoutez ce domaine `*.a.run.app`.
5. Ouvrez cette adresse permanente sur votre PC et votre iPad pour installer l'application.

---

## Option 2 : Déploiement gratuit sur Render ou Firebase Hosting

### A. Render (serveur Node complet avec import web par URL)
Le fichier `render.yaml` est inclus. Connectez votre dépôt GitHub à [Render.com](https://render.com) → **New → Blueprint** : tout est configuré automatiquement (`npm install && npm run build`, `npm start`). Ajoutez ensuite votre domaine `*.onrender.com` dans **Firebase Console → Authorized domains**.

### B. Firebase Hosting (hébergement statique gratuit, domaine déjà autorisé)
Le fichier `firebase.json` est inclus. Toutes les fonctionnalités (recettes, planning, liste de courses, synchro temps réel PC/iPad, hors-ligne et import par copier-coller) fonctionnent 100 % côté navigateur sans serveur Node :

```bash
npm install
npm run build
npx firebase-tools login
npx firebase-tools deploy --only hosting --project gen-lang-client-0730235019
```

Votre application sera disponible en permanence sur `https://gen-lang-client-0730235019.web.app`.

---

## Option 3 : Exécuter en autonomie totale sur votre propre PC (Windows / Mac)

Prérequis : [Node.js 22+](https://nodejs.org/)

- **Windows** : double-cliquez simplement sur **`start-cuisinesync.bat`**
- **Mac** : double-cliquez simplement sur **`start-cuisinesync.command`**

Ou en ligne de commande :

```bash
npm install
npm run build
npm start
```

- **Sur votre PC** : `http://localhost:3000`
- **Sur votre iPhone/iPad (même Wi-Fi)** : `http://<adresse-IP-de-votre-PC>:3000`

### Variables d'environnement optionnelles (`.env`)
- `PORT` : Port du serveur (par défaut `3000`).
- `GEMINI_API_KEY` *(optionnelle)* : Utilisée uniquement en renfort pour structurer un texte libre complexe. L'extracteur Schema.org (Mordu/Radio-Canada, Ricardo, Marmiton, etc.) et l'extracteur local fonctionnent **sans clé API**.
