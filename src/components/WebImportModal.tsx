import React, { useState, useEffect } from 'react';
import { X, Sparkles, Globe, FileText, CheckCircle2, AlertCircle, Loader2, ArrowRight } from 'lucide-react';
import { Recipe } from '../types/recipe';
import { importRecipeFromWeb, DEMO_URL_EXAMPLES, DEMO_TEXT_EXAMPLE } from '../services/recipeImporter';

interface WebImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRecipeImported: (recipe: Recipe) => void;
  currentUserId: string;
}

export const WebImportModal: React.FC<WebImportModalProps> = ({
  isOpen,
  onClose,
  onRecipeImported,
  currentUserId,
}) => {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<'url' | 'text'>('url');
  const [urlInput, setUrlInput] = useState('');
  const [textInput, setTextInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Extracted preview state before confirming
  const [extractedRecipe, setExtractedRecipe] = useState<Partial<Recipe> | null>(null);
  const [customComments, setCustomComments] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [loadingStepText, setLoadingStepText] = useState('Connexion et lecture de la page...');

  // Animate progress text during loading
  useEffect(() => {
    if (!isLoading) return;
    const steps = [
      'Connexion et lecture de la page web...',
      'Analyse des ingrédients et des quantités...',
      'Structuration des étapes de préparation...',
      'Classification des rayons d\'épicerie...',
      'Finalisation de la fiche recette...',
    ];
    let idx = 0;
    setLoadingStepText(steps[0]);
    const interval = setInterval(() => {
      idx = (idx + 1) % steps.length;
      setLoadingStepText(steps[idx]);
    }, 2200);

    return () => clearInterval(interval);
  }, [isLoading]);

  const handleStartImport = async (targetUrl?: string, targetText?: string) => {
    setIsLoading(true);
    setErrorMsg(null);

    const urlToUse = targetUrl !== undefined ? targetUrl : (activeTab === 'url' ? urlInput.trim() : undefined);
    const textToUse = targetText !== undefined ? targetText : (activeTab === 'text' ? textInput.trim() : undefined);

    if (!urlToUse && !textToUse) {
      setErrorMsg('Veuillez entrer une adresse web ou coller le texte de la recette.');
      setIsLoading(false);
      return;
    }

    const result = await importRecipeFromWeb(urlToUse, textToUse);

    if (result.success && result.recipe) {
      setExtractedRecipe(result.recipe);
      setSelectedCategories(result.recipe.categories || ['plat principal']);
      setCustomComments(result.recipe.comments || '');
    } else {
      let friendlyError = result.error || 'Erreur lors de l\'importation.';
      if (friendlyError.includes('503') || friendlyError.includes('high demand') || friendlyError.includes('UNAVAILABLE')) {
        friendlyError = 'Le serveur d\'IA connaît une forte demande temporaire. L\'extraction de secours va prendre le relais : vous pouvez réessayer immédiatement ou coller les ingrédients ci-dessous.';
      } else if (friendlyError.includes('403') || friendlyError.includes('bloquent')) {
        friendlyError = 'Ce site web bloque l\'accès automatisé par robot (protection anti-bot). Copiez simplement le texte des ingrédients et collez-le dans l\'onglet "Copier-coller le texte" pour l\'extraire instantanément !';
      }
      setErrorMsg(friendlyError);
    }
    setIsLoading(false);
  };

  const handleConfirmSave = () => {
    if (!extractedRecipe) return;

    const newId = `rec_web_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const fullRecipe: Recipe = {
      id: newId,
      userId: currentUserId || 'default',
      title: extractedRecipe.title || 'Recette importée',
      description: extractedRecipe.description || '',
      prepTimeMinutes: extractedRecipe.prepTimeMinutes || 15,
      cookTimeMinutes: extractedRecipe.cookTimeMinutes || 20,
      servings: extractedRecipe.servings || 4,
      imageUrl: extractedRecipe.imageUrl || undefined,
      sourceUrl: extractedRecipe.sourceUrl || urlInput.trim() || undefined,
      comments: customComments.trim() || undefined,
      categories: selectedCategories.length ? selectedCategories : ['plat principal'],
      ingredients: (extractedRecipe.ingredients || []).map((ing, i) => ({
        id: `ing_${i}_${Date.now()}`,
        name: ing.name,
        amount: ing.amount || '',
        unit: ing.unit || '',
        category: ing.category || 'Épicerie & Féculents',
      })),
      instructions: (extractedRecipe.instructions || []).map((step, i) => ({
        stepNumber: i + 1,
        text: step.text,
        durationMinutes: step.durationMinutes,
      })),
      rating: 5,
      favorite: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onRecipeImported(fullRecipe);
    handleResetAndClose();
  };

  const handleResetAndClose = () => {
    setUrlInput('');
    setTextInput('');
    setExtractedRecipe(null);
    setErrorMsg(null);
    setIsLoading(false);
    onClose();
  };

  const toggleCategory = (cat: string) => {
    const norm = cat.toLowerCase();
    if (selectedCategories.includes(norm)) {
      setSelectedCategories(selectedCategories.filter(c => c !== norm));
    } else {
      setSelectedCategories([...selectedCategories, norm]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-100 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-md z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center font-bold">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Importer une recette du Web</h2>
              <p className="text-xs text-slate-500">L'IA extrait le titre, les ingrédients dosés et les étapes</p>
            </div>
          </div>
          <button
            onClick={handleResetAndClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-6">
          {!extractedRecipe ? (
            <>
              {/* Tabs: URL vs Raw Text */}
              <div className="flex rounded-2xl bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() => { setActiveTab('url'); setErrorMsg(null); }}
                  className={`flex-1 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
                    activeTab === 'url' ? 'bg-white text-orange-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Globe className="w-4 h-4" />
                  <span>Adresse URL du site</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setActiveTab('text'); setErrorMsg(null); }}
                  className={`flex-1 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
                    activeTab === 'text' ? 'bg-white text-orange-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  <span>Copier-coller le texte</span>
                </button>
              </div>

              {/* Tab 1: URL input */}
              {activeTab === 'url' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Lien web de la recette
                    </label>
                    <div className="relative">
                      <input
                        type="url"
                        disabled={isLoading}
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleStartImport();
                          }
                        }}
                        placeholder="https://www.marmiton.org/recettes/recette_..."
                        className="w-full pl-4 pr-10 py-3 rounded-2xl border border-slate-200 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                      />
                      <Globe className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5" />
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1.5">
                      Fonctionne avec Marmiton, 750g, Cuisine AZ, BBC Good Food, Allrecipes, blogs culinaires...
                    </p>
                  </div>

                  {/* 1-Click Demo Examples */}
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
                    <p className="text-xs font-bold text-slate-600">Ou testez instantanément avec un exemple :</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {DEMO_URL_EXAMPLES.slice(0, 2).map((demo) => (
                        <button
                          key={demo.name}
                          type="button"
                          disabled={isLoading}
                          onClick={() => {
                            setUrlInput(demo.url);
                            handleStartImport(demo.url);
                          }}
                          className="text-left p-2.5 rounded-xl bg-white hover:bg-orange-50 border border-slate-200 hover:border-orange-200 text-xs transition-colors"
                        >
                          <span className="font-semibold text-slate-800 block">{demo.name}</span>
                          <span className="text-[11px] text-slate-400 line-clamp-1">{demo.description}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Raw Text input */}
              {activeTab === 'text' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Texte ou ingrédients copiés depuis le web
                    </label>
                    <textarea
                      rows={6}
                      disabled={isLoading}
                      value={textInput}
                      onChange={(e) => setTextInput(e.target.value)}
                      placeholder="Collez ici les ingrédients et la préparation..."
                      className="w-full p-3.5 rounded-2xl border border-slate-200 text-xs sm:text-sm text-slate-800 outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                    />
                  </div>

                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => {
                      setTextInput(DEMO_TEXT_EXAMPLE);
                      handleStartImport(undefined, DEMO_TEXT_EXAMPLE);
                    }}
                    className="text-xs font-semibold text-orange-600 hover:text-orange-700 hover:underline"
                  >
                    + Remplir avec un exemple de texte (Quiche aux poireaux & chèvre)
                  </button>
                </div>
              )}

              {/* Error Alert */}
              {errorMsg && (
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-100 flex items-start gap-2.5 text-rose-700 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold">Importation impossible</p>
                    <p className="mt-0.5 leading-relaxed">{errorMsg}</p>
                    {activeTab === 'url' && (
                      <button
                        type="button"
                        onClick={() => setActiveTab('text')}
                        className="mt-1.5 font-bold underline"
                      >
                        Basculer sur le copier-coller de texte &rarr;
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Submit Button & Cancel button during loading */}
              <div className="pt-2 space-y-2">
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => handleStartImport()}
                  className="w-full py-3.5 rounded-2xl font-bold bg-orange-600 hover:bg-orange-700 disabled:opacity-75 text-white text-sm shadow-md shadow-orange-600/20 flex items-center justify-center gap-2 transition-all active:scale-98"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                      <span className="truncate">{loadingStepText}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Extraire la recette avec l'IA</span>
                    </>
                  )}
                </button>

                {isLoading && (
                  <div className="text-center pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setIsLoading(false);
                        setErrorMsg('Extraction interrompue par l\'utilisateur.');
                      }}
                      className="text-xs font-semibold text-slate-500 hover:text-rose-600 underline"
                    >
                      Annuler l'analyse
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            /* Extracted Preview & Customization */
            <div className="space-y-5 animate-in fade-in">
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center gap-2.5 text-emerald-800 text-xs font-semibold">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>Recette extraite avec succès ! Vous pouvez la personnaliser avant de l'enregistrer.</span>
              </div>

              {/* Title & Times */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
                <h3 className="font-extrabold text-base sm:text-lg text-slate-900">
                  {extractedRecipe.title}
                </h3>
                <p className="text-xs text-slate-500 italic">
                  {extractedRecipe.description}
                </p>
                <div className="flex items-center gap-4 text-xs font-semibold text-slate-600 pt-2 border-t border-slate-200/60">
                  <span>Prépa: {extractedRecipe.prepTimeMinutes || 15} min</span>
                  <span>Cuisson: {extractedRecipe.cookTimeMinutes || 20} min</span>
                  <span>Portions: {extractedRecipe.servings || 4} pers.</span>
                  <span>Ingrédients: {extractedRecipe.ingredients?.length || 0}</span>
                </div>
              </div>

              {/* Categories customization ("végétarien", "rapide") */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Catégories détectées / à associer :
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {['végétarien', 'rapide', 'plat principal', 'entrée', 'dessert', 'santé', 'sans gluten'].map((cat) => {
                    const isSelected = selectedCategories.includes(cat);
                    const isVeg = cat === 'végétarien';
                    const isQuick = cat === 'rapide';
                    return (
                      <button
                        type="button"
                        key={cat}
                        onClick={() => toggleCategory(cat)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                          isSelected
                            ? isVeg
                              ? 'bg-emerald-600 text-white'
                              : isQuick
                              ? 'bg-amber-500 text-white'
                              : 'bg-orange-600 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {isVeg && '🌱 '}
                        {isQuick && '⚡ '}
                        <span className="capitalize">{cat}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Personal Comments attachment */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Attacher un commentaire ou une remarque personnelle :
                </label>
                <textarea
                  rows={2}
                  value={customComments}
                  onChange={(e) => setCustomComments(e.target.value)}
                  placeholder="Ex: Conseil de mamie, réduire le sucre de moitié, ajouter du thym..."
                  className="w-full p-3 rounded-2xl border border-slate-200 text-xs sm:text-sm text-slate-800 outline-none focus:ring-2 focus:ring-orange-500/20"
                />
              </div>

              {/* Sample Ingredients preview */}
              <div className="border border-slate-100 rounded-2xl p-3 bg-white">
                <p className="text-xs font-bold text-slate-700 mb-2">Aperçu des ingrédients extraits :</p>
                <div className="max-h-36 overflow-y-auto space-y-1 text-xs text-slate-600 pr-1">
                  {extractedRecipe.ingredients?.map((ing, idx) => (
                    <div key={idx} className="flex justify-between py-0.5 border-b border-slate-50">
                      <span>• {ing.amount} {ing.unit} {ing.name}</span>
                      <span className="text-[10px] text-slate-400 capitalize">{ing.category}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Confirmation Actions */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setExtractedRecipe(null)}
                  className="flex-1 py-3 rounded-2xl border border-slate-200 text-xs sm:text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Recommencer
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSave}
                  className="flex-2 py-3 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-orange-600/20 flex items-center justify-center gap-2"
                >
                  <span>Enregistrer dans mon carnet</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
