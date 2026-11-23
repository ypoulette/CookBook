import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import {
  X,
  Smartphone,
  Monitor,
  Share,
  PlusSquare,
  Download,
  Copy,
  Check,
  ExternalLink,
  Server,
  AlertTriangle,
  CheckCircle2,
  QrCode,
  Globe,
  Terminal,
  Rocket,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface InstallGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type GuideTab = 'standalone' | 'pc' | 'ios';

export const InstallGuideModal: React.FC<InstallGuideModalProps> = ({ isOpen, onClose }) => {
  const { isInstallable, isInstalled, isIOS, isMac, isInIframe, browser, install } = usePWAInstall();
  const [appUrl, setAppUrl] = useState<string>('');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedCmd, setCopiedCmd] = useState<'local' | 'firebase' | null>(null);
  const [installFeedback, setInstallFeedback] = useState<'idle' | 'installing' | 'done'>('idle');
  const [showTempPreviewUrl, setShowTempPreviewUrl] = useState(false);

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const isTemporaryPreviewHost =
    (appUrl || currentOrigin).includes('ais-dev-') || (appUrl || currentOrigin).includes('ais-pre-');

  const [activeTab, setActiveTab] = useState<GuideTab>(
    isTemporaryPreviewHost ? 'standalone' : isIOS ? 'ios' : 'pc'
  );

  // Switch default tab intelligently when modal opens
  useEffect(() => {
    if (isOpen) {
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const isTemp = origin.includes('ais-dev-') || origin.includes('ais-pre-');
      setActiveTab(isTemp ? 'standalone' : isIOS ? 'ios' : 'pc');
      setShowTempPreviewUrl(false);
    }
  }, [isOpen, isIOS]);

  // Resolve the current URL
  useEffect(() => {
    if (!isOpen) return;

    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    setAppUrl(origin);

    fetch('/api/app-info')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.appUrl && typeof data.appUrl === 'string') {
          if (!origin || origin.includes('localhost') || origin.includes('127.0.0.1')) {
            setAppUrl(data.appUrl);
          } else {
            setAppUrl(origin);
          }
        }
      })
      .catch(() => {
        // Static/offline host: keep window.location.origin
      });
  }, [isOpen]);

  // Generate QR code locally for the resolved URL
  useEffect(() => {
    if (!isOpen || !appUrl) return;
    if (isTemporaryPreviewHost && !showTempPreviewUrl) return;
    QRCode.toDataURL(appUrl, {
      width: 180,
      margin: 1,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    })
      .then(setQrDataUrl)
      .catch((err) => console.warn('QR generation error:', err));
  }, [isOpen, appUrl, isTemporaryPreviewHost, showTempPreviewUrl]);

  if (!isOpen) return null;

  const handleCopyUrl = async () => {
    if (!appUrl) return;
    try {
      await navigator.clipboard.writeText(appUrl);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2500);
    } catch {
      // ignore
    }
  };

  const handleCopyCommands = async (type: 'local' | 'firebase') => {
    const cmds =
      type === 'local'
        ? 'npm install\nnpm run build\nnpm start'
        : 'npm install\nnpm run build\nnpx firebase-tools login\nnpx firebase-tools deploy --only hosting --project gen-lang-client-0730235019';
    try {
      await navigator.clipboard.writeText(cmds);
      setCopiedCmd(type);
      setTimeout(() => setCopiedCmd(null), 2500);
    } catch {
      // ignore
    }
  };

  const handleNativeInstall = async () => {
    setInstallFeedback('installing');
    const accepted = await install();
    setInstallFeedback(accepted ? 'done' : 'idle');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl border border-slate-100 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 gap-3">
          <div className="flex items-center gap-3">
            <img
              src="/pwa-192x192.png"
              alt="CuisineSync"
              className="w-11 h-11 rounded-2xl shadow-md shadow-orange-500/20 object-cover shrink-0"
            />
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-extrabold text-slate-900">
                  Mode autonome &amp; installation PC / iOS
                </h3>
                {isInstalled && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                    <CheckCircle2 className="w-3 h-3" />
                    Installée
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                Déploiement permanent 24/7, installation bureau et écran d’accueil iPhone/iPad
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors shrink-0"
            aria-label="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-5 pt-5">
          {/* CRITICAL WARNING when running on temporary preview host */}
          {isTemporaryPreviewHost ? (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 space-y-2.5 text-xs text-rose-950">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="space-y-1.5 leading-relaxed">
                  <p className="font-bold text-sm text-rose-900">
                    Vous êtes actuellement sur l’adresse d’aperçu temporaire
                  </p>
                  <p>
                    L’adresse actuelle (<code className="px-1.5 py-0.5 bg-white/80 border border-rose-200 rounded font-mono text-[11px]">ais-dev-…</code>) est un serveur de développement temporaire qui <strong>s’arrête automatiquement dès que l’éditeur est fermé</strong>.
                  </p>
                  <p className="font-semibold">
                    N’installez pas ce lien temporaire sur votre PC ou votre iPad : déployez d’abord l’application sur votre propre adresse permanente ci-dessous (2 minutes), puis installez CETTE adresse permanente.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* 1-Click Native PWA Install Banner (only on permanent/standalone host) */}
              {isInstallable && !isInstalled && (
                <div className="p-4 rounded-2xl bg-linear-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <p className="font-bold text-sm">Installation directe prête sur cet appareil</p>
                    <p className="text-xs text-orange-50 mt-0.5">
                      Installez CuisineSync comme une vraie application autonome en un clic.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleNativeInstall}
                    disabled={installFeedback === 'installing'}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white text-orange-700 hover:bg-orange-50 font-bold text-xs sm:text-sm shadow-sm transition-all shrink-0 cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>
                      {installFeedback === 'done'
                        ? 'Installée !'
                        : installFeedback === 'installing'
                        ? 'Installation...'
                        : 'Installer maintenant'}
                    </span>
                  </button>
                </div>
              )}

              {/* Direct Permanent Address + QR Code Reference Box */}
              <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200/80 space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-emerald-600" />
                    <h4 className="font-bold text-slate-900 text-sm">
                      Adresse permanente de votre application
                    </h4>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                    <CheckCircle2 className="w-3 h-3" />
                    Mode autonome actif
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
                  <div className="flex-1 space-y-2.5 min-w-0">
                    <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2">
                      <code className="text-xs text-slate-800 font-mono truncate flex-1 select-all">
                        {appUrl || 'Chargement de l’adresse...'}
                      </code>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={handleCopyUrl}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold transition-colors shadow-xs"
                      >
                        {copiedUrl ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedUrl ? 'Adresse copiée !' : 'Copier l’adresse'}</span>
                      </button>

                      {appUrl && isInIframe && (
                        <a
                          href={appUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5 text-orange-600" />
                          <span>Ouvrir dans un onglet</span>
                        </a>
                      )}
                    </div>

                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      Sur <strong>iPhone / iPad</strong>, scannez le QR Code ci-contre puis ouvrez le lien dans <strong>Safari</strong> pour l’ajouter à l’écran d’accueil.
                    </p>
                  </div>

                  {/* Scannable QR Code */}
                  <div className="flex flex-col items-center justify-center bg-white p-2.5 rounded-2xl border border-slate-200 shrink-0 self-center">
                    {qrDataUrl ? (
                      <img
                        src={qrDataUrl}
                        alt="QR Code pour ouvrir CuisineSync sur iOS"
                        className="w-28 h-28 rounded-lg"
                      />
                    ) : (
                      <div className="w-28 h-28 flex items-center justify-center text-slate-300">
                        <QrCode className="w-10 h-10" />
                      </div>
                    )}
                    <span className="text-[10px] font-semibold text-slate-500 mt-1">
                      Scanner sur iOS
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* 3-Tab Switcher */}
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-2xl">
            <button
              type="button"
              onClick={() => setActiveTab('standalone')}
              className={`flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'standalone'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Rocket className="w-4 h-4 text-orange-600 shrink-0" />
              <span>Rendre autonome</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('pc')}
              className={`flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'pc'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Monitor className="w-4 h-4 text-orange-600 shrink-0" />
              <span>PC / Mac</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('ios')}
              className={`flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'ios'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Smartphone className="w-4 h-4 text-orange-600 shrink-0" />
              <span>iPhone / iPad</span>
            </button>
          </div>

          {/* TAB 1: AUTONOMOUS / PERMANENT DEPLOYMENT */}
          {activeTab === 'standalone' && (
            <div className="space-y-3.5">
              {/* Method 1: Free Permanent Cloud Hosting (Render or Cloud Run) */}
              <div className="p-4 rounded-2xl bg-orange-50/70 border border-orange-200 space-y-2.5 text-xs text-slate-800 leading-relaxed">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <Rocket className="w-4 h-4 text-orange-600 shrink-0" />
                    <span>Option 1 (Recommandée) : Héberger 24/7 gratuitement sur Render ou Cloud Run</span>
                  </h4>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-200/80 text-orange-900">
                    PC + iPad partout
                  </span>
                </div>
                <p className="text-slate-600">
                  Vous obtenez votre propre adresse HTTPS permanente qui tourne 24h/24 avec importation web par URL et synchronisation Cloud, sans jamais ouvrir l’éditeur.
                </p>
                <ol className="space-y-2 list-decimal list-inside">
                  <li>
                    <strong>Exporter le projet :</strong> dans la barre supérieure, cliquez sur <strong>Save to GitHub</strong> (ou <strong>Download app</strong> pour télécharger le ZIP). <em>Si un bouton <strong>Deploy</strong> est visible dans votre barre supérieure, vous pouvez aussi déployer directement sur Google Cloud Run.</em>
                  </li>
                  <li>
                    <strong>Déployer gratuitement sur Render :</strong> ouvrez <code className="px-1.5 py-0.5 bg-white border border-orange-200 rounded font-mono text-[11px]">render.com</code> → <strong>New → Blueprint</strong> → sélectionnez votre dépôt GitHub. Le fichier <code className="font-mono">render.yaml</code> inclus configure tout automatiquement.
                  </li>
                  <li>
                    <strong>Étape indispensable pour la synchro Google :</strong> ouvrez la <strong>Console Firebase</strong> (projet <code className="font-mono">gen-lang-client-0730235019</code>) → <strong>Authentication → Settings → Authorized domains</strong> → ajoutez votre nouveau domaine (ex. <code className="font-mono">cuisinesync.onrender.com</code> ou <code className="font-mono">….run.app</code>).
                  </li>
                  <li>
                    Ouvrez cette adresse permanente sur votre PC et votre iPad, puis installez-la (onglets <strong>PC / Mac</strong> et <strong>iPhone / iPad</strong>).
                  </li>
                </ol>
              </div>

              {/* Method 2: Firebase Hosting or Render (Free & Independent) */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2.5 text-xs text-slate-700 leading-relaxed">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <Server className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Option 2 : Héberger gratuitement sur Firebase Hosting ou Render</span>
                  </h4>
                  <button
                    type="button"
                    onClick={() => handleCopyCommands('firebase')}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-[11px] font-semibold text-slate-700"
                  >
                    {copiedCmd === 'firebase' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedCmd === 'firebase' ? 'Copié' : 'Copier commandes'}</span>
                  </button>
                </div>
                <p>
                  Les fichiers <code className="px-1 py-0.5 bg-slate-100 rounded font-mono text-[11px]">firebase.json</code>, <code className="px-1 py-0.5 bg-slate-100 rounded font-mono text-[11px]">Dockerfile</code> et <code className="px-1 py-0.5 bg-slate-100 rounded font-mono text-[11px]">render.yaml</code> sont déjà prêts dans le projet :
                </p>
                <ul className="space-y-1.5 list-disc list-inside">
                  <li>
                    <strong>Firebase Hosting</strong> (gratuit, domaine Google déjà autorisé <code className="font-mono text-slate-800">https://gen-lang-client-0730235019.web.app</code>) : exportez le projet puis exécutez :
                  </li>
                </ul>
                <pre className="p-2.5 rounded-xl bg-slate-900 text-slate-100 font-mono text-[11px] overflow-x-auto">
{`npm install
npm run build
npx firebase-tools login
npx firebase-tools deploy --only hosting --project gen-lang-client-0730235019`}
                </pre>
                <p className="text-[11px] text-slate-500">
                  Sur Firebase Hosting (statique), toutes vos recettes, le planning, la liste de courses, la synchro temps réel PC/iPad et l’import par copier-coller fonctionnent 100 % sans serveur. Pour conserver aussi l’importation automatique par lien URL, préférez <strong>Cloud Run (Option 1)</strong> ou <strong>Render</strong> (connectez le dépôt GitHub, <code className="font-mono">render.yaml</code> configure tout automatiquement).
                </p>
              </div>

              {/* Method 3: Run Directly on Your Own PC */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5 text-xs text-slate-700 leading-relaxed">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                    <Terminal className="w-4 h-4 text-orange-600" />
                    <span>Option 3 : Lancer en autonomie totale sur votre PC (Windows / Mac)</span>
                  </h4>
                  <button
                    type="button"
                    onClick={() => handleCopyCommands('local')}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-[11px] font-semibold text-slate-700"
                  >
                    {copiedCmd === 'local' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedCmd === 'local' ? 'Copié' : 'Copier'}</span>
                  </button>
                </div>
                <p>
                  Téléchargez le projet en ZIP, installez <strong>Node.js 22+</strong> (<code className="font-mono">nodejs.org</code>), puis double-cliquez simplement sur :
                </p>
                <ul className="space-y-1 list-disc list-inside font-medium text-slate-800">
                  <li>
                    Windows : <code className="px-1.5 py-0.5 bg-white border border-slate-200 rounded font-mono text-[11px]">start-cuisinesync.bat</code>
                  </li>
                  <li>
                    Mac : <code className="px-1.5 py-0.5 bg-white border border-slate-200 rounded font-mono text-[11px]">start-cuisinesync.command</code>
                  </li>
                </ul>
                <p className="text-[11px] text-slate-500">
                  Ou manuellement dans un terminal (<code className="font-mono">npm install &amp;&amp; npm run build &amp;&amp; npm start</code>). L’application s’ouvre sur <code className="font-mono text-slate-700">http://localhost:3000</code> et reste accessible sur votre iPad (même Wi-Fi) via <code className="font-mono text-slate-700">http://IP-DU-PC:3000</code>.
                </p>
              </div>

              {/* Collapsible Temporary Preview Link (only if needed for live tests) */}
              {isTemporaryPreviewHost && appUrl && (
                <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setShowTempPreviewUrl((v) => !v)}
                    className="w-full px-4 py-3 flex items-center justify-between text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    <span>Afficher l’adresse d’aperçu temporaire (tests rapides uniquement)</span>
                    {showTempPreviewUrl ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  {showTempPreviewUrl && (
                    <div className="px-4 pb-4 pt-1 border-t border-slate-100 flex flex-col sm:flex-row gap-3 items-center">
                      <div className="flex-1 space-y-2 w-full min-w-0">
                        <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                          <code className="text-[11px] text-slate-700 font-mono break-all select-all">
                            {appUrl}
                          </code>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={handleCopyUrl}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold"
                          >
                            {copiedUrl ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{copiedUrl ? 'Copié' : 'Copier'}</span>
                          </button>
                          <a
                            href={appUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>Ouvrir</span>
                          </a>
                        </div>
                      </div>
                      {qrDataUrl && (
                        <img
                          src={qrDataUrl}
                          alt="QR Code aperçu temporaire"
                          className="w-24 h-24 rounded-lg border border-slate-200 shrink-0"
                        />
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: PC / MAC INSTRUCTIONS */}
          {activeTab === 'pc' && (
            <div className="space-y-3.5">
              {/* Chrome */}
              <div
                className={`p-4 rounded-2xl border ${
                  browser === 'chrome'
                    ? 'bg-orange-50/60 border-orange-200'
                    : 'bg-white border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-slate-900 text-sm">
                    Google Chrome (Windows / Mac)
                  </h4>
                  {browser === 'chrome' && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
                      Votre navigateur
                    </span>
                  )}
                </div>
                <ol className="text-xs text-slate-700 space-y-2 leading-relaxed">
                  <li className="flex gap-2">
                    <span className="font-bold text-orange-600 shrink-0">1.</span>
                    <span>
                      Ouvrez votre <strong>adresse permanente</strong> (déployée via l’onglet <em>Rendre autonome</em>) dans un onglet normal de Chrome.
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-bold text-orange-600 shrink-0">2.</span>
                    <span>
                      À droite de la barre d’adresse, cliquez sur l’icône d’installation <Download className="w-3.5 h-3.5 inline text-slate-800 mx-0.5" /> <strong>Installer CuisineSync</strong>.
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-bold text-orange-600 shrink-0">3.</span>
                    <span>
                      Si l’icône n’est pas visible : menu <strong>⋮</strong> (en haut à droite) → <strong>Caster, enregistrer et partager</strong> → <strong>Installer la page en tant qu’application…</strong>
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-bold text-orange-600 shrink-0">4.</span>
                    <span>
                      Validez sur <strong>Installer</strong>. L’application s’ajoute à votre Bureau / Menu Démarrer et s’ouvre dans sa propre fenêtre autonome.
                    </span>
                  </li>
                </ol>
              </div>

              {/* Microsoft Edge */}
              <div
                className={`p-4 rounded-2xl border ${
                  browser === 'edge'
                    ? 'bg-orange-50/60 border-orange-200'
                    : 'bg-white border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-slate-900 text-sm">
                    Microsoft Edge (Windows / Mac)
                  </h4>
                  {browser === 'edge' && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
                      Votre navigateur
                    </span>
                  )}
                </div>
                <ol className="text-xs text-slate-700 space-y-2 leading-relaxed">
                  <li className="flex gap-2">
                    <span className="font-bold text-orange-600 shrink-0">1.</span>
                    <span>Ouvrez votre adresse permanente dans Microsoft Edge.</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-bold text-orange-600 shrink-0">2.</span>
                    <span>
                      Cliquez sur l’icône <strong>Application disponible</strong> dans la barre d’adresse, ou ouvrez le menu <strong>⋯</strong> → <strong>Applications</strong> → <strong>Installer ce site en tant qu’application</strong>.
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-bold text-orange-600 shrink-0">3.</span>
                    <span>
                      Cochez <strong>Épingler à la barre des tâches</strong> ou <strong>Créer un raccourci sur le Bureau</strong>.
                    </span>
                  </li>
                </ol>
              </div>

              {/* Safari macOS + Firefox note */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1.5 leading-relaxed">
                <p>
                  <strong>{isMac ? 'Safari sur votre Mac (macOS Sonoma 14+)' : 'Safari sur Mac'} :</strong> menu <strong>Fichier → Ajouter au Dock…</strong>
                </p>
                <p>
                  <strong>Firefox sur PC :</strong> utilisez <strong>Chrome</strong> ou <strong>Edge</strong> pour installer l’application sur le Bureau.
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: iOS (iPhone / iPad) COMPLETE INSTRUCTIONS */}
          {activeTab === 'ios' && (
            <div className="space-y-3.5">
              <div className="p-4 rounded-2xl bg-orange-50/70 border border-orange-200/80 space-y-3">
                <h4 className="font-bold text-slate-900 text-sm">
                  Installation complète sur iPhone &amp; iPad (Safari obligatoire)
                </h4>

                <div className="p-2.5 rounded-xl bg-white/90 border border-orange-200/70 text-[11px] text-orange-900">
                  <strong>Important sur iOS :</strong> utilisez votre <strong>adresse permanente</strong> (déployée via <em>Rendre autonome</em>) dans <strong>Safari</strong> pour obtenir une icône autonome plein écran qui fonctionne en tout temps.
                </div>

                <ol className="text-xs text-slate-700 space-y-3 leading-relaxed">
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-orange-600 text-white font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                      1
                    </span>
                    <span>
                      <strong>Ouvrir votre adresse permanente dans Safari :</strong> saisissez l’adresse ou scannez le QR Code depuis votre PC une fois l’app ouverte sur son adresse permanente.
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-orange-600 text-white font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                      2
                    </span>
                    <span>
                      <strong>Appuyer sur Partager :</strong> touchez l’icône <Share className="w-3.5 h-3.5 text-blue-600 inline mx-0.5" /> <strong>Partager</strong> (<strong>en bas au centre</strong> sur iPhone, ou <strong>en haut à droite</strong> sur iPad).
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-orange-600 text-white font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                      3
                    </span>
                    <span>
                      <strong>Choisir « Sur l’écran d’accueil » :</strong> faites défiler vers le bas jusqu’à <strong className="inline-flex items-center gap-1"><PlusSquare className="w-3.5 h-3.5 text-slate-700" /> Sur l’écran d’accueil</strong>.
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-orange-600 text-white font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                      4
                    </span>
                    <span>
                      <strong>Confirmer :</strong> laissez <strong>« Ouvrir comme app web »</strong> activé, puis touchez <strong>Ajouter</strong> en haut à droite.
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                      5
                    </span>
                    <span>
                      <strong>Synchroniser avec votre PC :</strong> ouvrez la nouvelle icône <strong>CuisineSync</strong> sur l’écran d’accueil, touchez <strong>Sync Cloud</strong> et connectez le même compte Google que sur votre PC.
                    </span>
                  </li>
                </ol>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-2xl text-sm transition-all"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
