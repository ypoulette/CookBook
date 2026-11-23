import React from 'react';
import { User } from 'firebase/auth';
import {
  Sparkles,
  Plus,
  Cloud,
  CloudCheck,
  RefreshCw,
  Smartphone,
  Download,
  LogOut,
  UtensilsCrossed,
  AlertCircle,
  X,
} from 'lucide-react';
import { loginWithGoogle, logoutUser } from '../services/firebase';
import { usePWAInstall } from '../hooks/usePWAInstall';

export type SyncStatus = 'local' | 'syncing' | 'synced' | 'error';

interface HeaderProps {
  currentUser: User | null;
  syncStatus?: SyncStatus;
  onManualSync?: () => void;
  onOpenImporter: () => void;
  onOpenNewRecipe: () => void;
  onOpenInstallGuide: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  syncStatus = 'local',
  onManualSync,
  onOpenImporter,
  onOpenNewRecipe,
  onOpenInstallGuide,
}) => {
  const [isAuthLoading, setIsAuthLoading] = React.useState(false);
  const [showUserMenu, setShowUserMenu] = React.useState(false);
  const [authError, setAuthError] = React.useState<string | null>(null);
  const { isInstallable, isInstalled } = usePWAInstall();

  const handleLogin = async () => {
    setIsAuthLoading(true);
    setAuthError(null);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      console.error('Login error:', err);
      setAuthError('Connexion impossible : ' + (err.message || 'Erreur d\'authentification'));
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
      setShowUserMenu(false);
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 transition-all pt-safe">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
        {/* Logo & Title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-linear-to-tr from-orange-500 to-amber-500 flex items-center justify-center text-white shadow-md shadow-orange-500/25">
            <UtensilsCrossed className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-xl tracking-tight text-slate-900">
                Cuisine<span className="text-orange-600">Sync</span>
              </span>
              <span className="hidden sm:inline-flex items-center text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
                PC &amp; iOS
              </span>
            </div>
            <p className="hidden md:block text-xs text-slate-500">
              Recettes • Planning • Liste de courses
            </p>
          </div>
        </div>

        {/* Actions & Cloud Sync */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* PWA Install & Access Button (auto-hides when already running in standalone mode) */}
          {!isInstalled && (
            <button
              type="button"
              onClick={onOpenInstallGuide}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                isInstallable
                  ? 'bg-orange-600 hover:bg-orange-700 text-white shadow-sm shadow-orange-600/25'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
              title="Installer ou ouvrir sur iPhone, iPad et PC"
            >
              {isInstallable ? (
                <Download className="w-3.5 h-3.5" />
              ) : (
                <Smartphone className="w-3.5 h-3.5 text-orange-600" />
              )}
              <span className="hidden sm:inline">
                {isInstallable ? 'Installer l’app' : 'Installer app'}
              </span>
            </button>
          )}

          {/* Cloud Auth Status */}
          {currentUser ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowUserMenu(!showUserMenu)}
                className={`flex items-center gap-2 p-1.5 pr-3 rounded-full border text-xs font-medium transition-colors ${
                  syncStatus === 'error'
                    ? 'bg-rose-50 hover:bg-rose-100 border-rose-200 text-rose-800'
                    : 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-800'
                }`}
              >
                {currentUser.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt={currentUser.displayName || 'Utilisateur'}
                    className="w-6 h-6 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold">
                    {(currentUser.displayName || currentUser.email || 'U')[0].toUpperCase()}
                  </div>
                )}
                <span className="hidden md:inline max-w-[120px] truncate">
                  {currentUser.displayName || currentUser.email?.split('@')[0]}
                </span>
                {syncStatus === 'syncing' ? (
                  <RefreshCw className="w-3 h-3 text-emerald-600 animate-spin" />
                ) : syncStatus === 'error' ? (
                  <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                ) : (
                  <CloudCheck className="w-3.5 h-3.5 text-emerald-600" />
                )}
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-60 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50 animate-in fade-in zoom-in-95">
                  <div className="px-4 py-2 border-b border-slate-100">
                    <p className="text-xs text-slate-500">Connecté avec</p>
                    <p className="text-sm font-semibold text-slate-800 truncate">{currentUser.email}</p>
                    <div
                      className={`flex items-center gap-1.5 text-[11px] mt-1 ${
                        syncStatus === 'error'
                          ? 'text-rose-600'
                          : syncStatus === 'syncing'
                          ? 'text-amber-600'
                          : 'text-emerald-600'
                      }`}
                    >
                      {syncStatus === 'error' ? (
                        <>
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>Erreur de synchronisation</span>
                        </>
                      ) : syncStatus === 'syncing' ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 shrink-0 animate-spin" />
                          <span>Synchronisation en cours…</span>
                        </>
                      ) : (
                        <>
                          <CloudCheck className="w-3.5 h-3.5 shrink-0" />
                          <span>Sync Cloud active (PC &amp; iOS)</span>
                        </>
                      )}
                    </div>
                  </div>
                  {onManualSync && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowUserMenu(false);
                        onManualSync();
                      }}
                      className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors"
                    >
                      <RefreshCw className="w-4 h-4 text-emerald-600" />
                      <span>Synchroniser maintenant</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setShowUserMenu(false);
                      onOpenInstallGuide();
                    }}
                    className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors"
                  >
                    <Smartphone className="w-4 h-4 text-orange-600" />
                    <span>Adresse &amp; installation PC / iOS</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Se déconnecter</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={handleLogin}
              disabled={isAuthLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 transition-colors"
              title="Synchronisez vos recettes sur PC et iOS"
            >
              <Cloud className="w-3.5 h-3.5 text-amber-600" />
              <span className="hidden sm:inline">
                {isAuthLoading ? 'Connexion...' : 'Sync Cloud'}
              </span>
            </button>
          )}

          {/* Import Recipe from Web */}
          <button
            type="button"
            onClick={onOpenImporter}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-orange-50 hover:bg-orange-100 border border-orange-200 text-orange-700 transition-colors shadow-2xs"
          >
            <Sparkles className="w-4 h-4 text-orange-600" />
            <span>
              Importer <span className="hidden sm:inline">web</span>
            </span>
          </button>

          {/* Add New Recipe Manually */}
          <button
            type="button"
            onClick={onOpenNewRecipe}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-orange-600 hover:bg-orange-700 text-white transition-all shadow-md shadow-orange-600/20 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Créer recette</span>
          </button>
        </div>
      </div>

      {/* Inline Auth Error Banner (replaces native window.alert) */}
      {authError && (
        <div className="bg-rose-50 border-t border-rose-200 px-4 py-2 text-xs text-rose-800 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 max-w-7xl mx-auto">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{authError}</span>
          </div>
          <button
            type="button"
            onClick={() => setAuthError(null)}
            className="text-rose-500 hover:text-rose-700 p-1"
            aria-label="Fermer l'alerte"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </header>
  );
};
