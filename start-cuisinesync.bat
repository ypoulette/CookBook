@echo off
title CuisineSync - Serveur Autonome
echo ===================================================
echo   CuisineSync - Demarrage en mode autonome (PC)
echo ===================================================
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
  echo [ERREUR] Node.js n'est pas installe.
  echo Telechargez Node.js 22+ sur https://nodejs.org puis relancez ce fichier.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo Installation des dependances...
  call npm install
)

if not exist "dist\index.html" (
  echo Compilation de l'application...
  call npm run build
)

echo.
echo Demarrage de CuisineSync sur http://localhost:3000 ...
echo Laissez cette fenetre ouverte pendant l'utilisation.
start "" http://localhost:3000
set NODE_ENV=production
call npm start
pause
