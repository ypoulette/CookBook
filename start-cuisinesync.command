#!/bin/bash
cd "$(dirname "$0")"

echo "==================================================="
echo "  CuisineSync - Demarrage en mode autonome (Mac)"
echo "==================================================="
echo ""

if ! command -v node >/dev/null 2>&1; then
  echo "[ERREUR] Node.js n'est pas installe."
  echo "Telechargez Node.js 22+ sur https://nodejs.org puis relancez ce fichier."
  read -p "Appuyez sur Entree pour fermer..."
  exit 1
fi

if [ ! -d "node_modules" ]; then
  echo "Installation des dependances..."
  npm install
fi

if [ ! -f "dist/index.html" ]; then
  echo "Compilation de l'application..."
  npm run build
fi

echo ""
echo "Demarrage de CuisineSync sur http://localhost:3000 ..."
(sleep 2 && open http://localhost:3000) &
NODE_ENV=production npm start
