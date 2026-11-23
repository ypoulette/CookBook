import React, { useState } from 'react';
import {
  ShoppingCart,
  Plus,
  Trash2,
  Check,
  Share2,
  RefreshCw,
  Sparkles,
  X,
  RotateCcw,
  AlertTriangle,
  Info
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { GroceryList, GroceryItem, GroceryCategory, GROCERY_CATEGORIES, DEFAULT_PANTRY_STAPLES } from '../types/recipe';

interface GroceryListViewProps {
  groceryList: GroceryList;
  pantryStaples: string[];
  onUpdateGroceryList: (list: GroceryList) => void;
  onUpdatePantryStaples: (staples: string[]) => void;
  onRegenerateFromPlan: (options?: { resetAll?: boolean }) => void;
  onClearGroceryList: () => void;
  weekRangeText: string;
}

const COMMON_PANTRY_SUGGESTIONS = [
  'sel',
  'poivre',
  'sel et poivre',
  'eau',
  'huile d\'olive',
  'huile végétale',
  'sucre',
  'farine',
  'beurre',
  'vinaigre',
  'ail',
  'sauce soja',
  'moutarde',
  'bouillon de poulet',
  'épices',
  'origan'
];

export const GroceryListView: React.FC<GroceryListViewProps> = ({
  groceryList,
  pantryStaples,
  onUpdateGroceryList,
  onUpdatePantryStaples,
  onRegenerateFromPlan,
  onClearGroceryList,
  weekRangeText,
}) => {
  const [newItemName, setNewItemName] = useState('');
  const [newItemAmount, setNewItemAmount] = useState('');
  const [newItemUnit, setNewItemUnit] = useState('');
  const [newItemCategory, setNewItemCategory] = useState<GroceryCategory>('Fruits & Légumes');
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [copiedFeedback, setCopiedFeedback] = useState(false);

  // Modals state (in-app, avoiding window.confirm/alert)
  const [isPantryModalOpen, setIsPantryModalOpen] = useState(false);
  const [showClearConfirmModal, setShowClearConfirmModal] = useState(false);
  const [showRegenerateModal, setShowRegenerateModal] = useState(false);
  const [newStapleInput, setNewStapleInput] = useState('');

  const items = groceryList.items || [];
  const checkedCount = items.filter(i => i.checked).length;
  const totalCount = items.length;
  const progressPercent = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0;

  // Toggle item checked
  const handleToggleCheck = (id: string) => {
    const nextItems = items.map(item => {
      if (item.id === id) {
        const nextChecked = !item.checked;
        if (nextChecked && checkedCount + 1 === totalCount && totalCount > 0) {
          try {
            confetti({ particleCount: 80, spread: 60, origin: { y: 0.7 } });
          } catch (e) {}
        }
        return { ...item, checked: nextChecked };
      }
      return item;
    });

    onUpdateGroceryList({
      ...groceryList,
      items: nextItems,
      updatedAt: new Date().toISOString(),
    });
  };

  // Add custom item
  const handleAddCustomItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;

    const newItem: GroceryItem = {
      id: `custom_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: newItemName.trim(),
      amount: newItemAmount.trim(),
      unit: newItemUnit.trim(),
      category: newItemCategory,
      checked: false,
      isCustom: true,
    };

    onUpdateGroceryList({
      ...groceryList,
      items: [...items, newItem],
      updatedAt: new Date().toISOString(),
    });

    setNewItemName('');
    setNewItemAmount('');
    setNewItemUnit('');
    setIsAddingItem(false);
  };

  // Delete item
  const handleDeleteItem = (id: string) => {
    const nextItems = items.filter(i => i.id !== id);
    onUpdateGroceryList({
      ...groceryList,
      items: nextItems,
      updatedAt: new Date().toISOString(),
    });
  };

  // Clear checked items
  const handleClearChecked = () => {
    const nextItems = items.filter(i => !i.checked);
    onUpdateGroceryList({
      ...groceryList,
      items: nextItems,
      updatedAt: new Date().toISOString(),
    });
  };

  // Pantry staples operations
  const handleAddStaple = (name: string) => {
    const clean = name.trim().toLowerCase();
    if (!clean) return;
    if (pantryStaples.includes(clean)) return;

    const updated = [...pantryStaples, clean];
    onUpdatePantryStaples(updated);
    setNewStapleInput('');
  };

  const handleRemoveStaple = (stapleToRemove: string) => {
    const updated = pantryStaples.filter(s => s !== stapleToRemove);
    onUpdatePantryStaples(updated);
  };

  const handleResetDefaultStaples = () => {
    onUpdatePantryStaples([...DEFAULT_PANTRY_STAPLES]);
  };

  const handleClearAllStaples = () => {
    onUpdatePantryStaples([]);
  };

  // Share list via Web Share API or Clipboard text
  const handleShareList = async () => {
    const textLines: string[] = [
      `🛒 Ma Liste de Courses CuisineSync (${weekRangeText})`,
      '----------------------------------------',
    ];

    GROCERY_CATEGORIES.forEach(cat => {
      const catItems = items.filter(i => (i.category || 'Épicerie & Féculents') === cat.name);
      if (catItems.length > 0) {
        textLines.push(`\n${cat.icon} ${cat.name.toUpperCase()}:`);
        catItems.forEach(item => {
          const checkStatus = item.checked ? '✅ ' : '⬜ ';
          const qty = item.amount ? `${item.amount} ${item.unit || ''} ` : '';
          textLines.push(`${checkStatus}${qty}${item.name}`);
        });
      }
    });

    const fullShareText = textLines.join('\n');

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Ma Liste de Courses',
          text: fullShareText,
        });
        return;
      } catch (err) {
        // user cancelled or fallback
      }
    }

    try {
      await navigator.clipboard.writeText(fullShareText);
      setCopiedFeedback(true);
      setTimeout(() => setCopiedFeedback(false), 2500);
    } catch (e) {
      // fallback
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Top Banner */}
      <div className="bg-white rounded-3xl p-4 sm:p-6 border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center font-bold shrink-0">
            <ShoppingCart className="w-6 h-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                Liste de courses
              </h2>
              {totalCount > 0 && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-100 text-orange-800">
                  {checkedCount} / {totalCount} cochés
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-slate-500 font-medium">
              Semaine du {weekRangeText}
            </p>
          </div>
        </div>

        {/* Action Buttons Toolbar */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-start md:justify-end">
          {/* Pantry / Excluded Staples Button */}
          <button
            onClick={() => setIsPantryModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-semibold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200/80 transition-colors shadow-2xs"
            title="Gérer les ingrédients de base de votre placard qui ne doivent pas figurer dans la liste de courses"
          >
            <span>🧂</span>
            <span>Ingrédients exclus ({pantryStaples.length})</span>
          </button>

          {/* Regenerate Button */}
          <button
            onClick={() => {
              if (totalCount === 0) {
                onRegenerateFromPlan({ resetAll: true });
              } else {
                setShowRegenerateModal(true);
              }
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-semibold bg-orange-600 hover:bg-orange-700 text-white shadow-md shadow-orange-600/20 active:scale-95 transition-all"
            title="Regénérer la liste depuis les repas prévus dans le planning"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Regénérer</span>
          </button>

          {/* Add Manual Item */}
          <button
            onClick={() => setIsAddingItem(!isAddingItem)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
          >
            <Plus className="w-3.5 h-3.5 text-orange-600" />
            <span>+ Article</span>
          </button>

          {/* Share */}
          {totalCount > 0 && (
            <button
              onClick={handleShareList}
              className="flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/70 transition-colors"
              title="Copier la liste pour SMS ou WhatsApp"
            >
              <Share2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>{copiedFeedback ? 'Copié ! ✅' : 'Partager'}</span>
            </button>
          )}

          {/* Clear List Button */}
          {totalCount > 0 && (
            <button
              onClick={() => setShowClearConfirmModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200/80 transition-colors"
              title="Vider toute la liste de courses"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Vider la liste</span>
            </button>
          )}

          {/* Clear checked only */}
          {checkedCount > 0 && (
            <button
              onClick={handleClearChecked}
              className="p-2 rounded-2xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              title="Effacer seulement les articles cochés"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      {totalCount > 0 && (
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-1.5">
            <span>Progression des courses</span>
            <span>{progressPercent}%</span>
          </div>
          <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-linear-to-r from-orange-500 to-emerald-500 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Informative banner about pantry exclusions */}
      <div className="bg-amber-50/60 border border-amber-200/60 rounded-2xl p-3 flex items-center justify-between gap-3 text-xs text-amber-900">
        <div className="flex items-center gap-2">
          <span className="text-base">🧂</span>
          <span>
            <strong>{pantryStaples.length} ingrédients de base</strong> sont actuellement exclus de vos courses (sel, poivre, eau, huiles...).
          </span>
        </div>
        <button
          onClick={() => setIsPantryModalOpen(true)}
          className="font-bold underline text-amber-800 hover:text-amber-950 shrink-0 text-xs"
        >
          Personnaliser
        </button>
      </div>

      {/* Add Custom Item Modal / Bar */}
      {isAddingItem && (
        <form
          onSubmit={handleAddCustomItem}
          className="bg-white rounded-3xl p-4 sm:p-5 border border-orange-200 shadow-md animate-in fade-in"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-slate-800 text-sm">Ajouter un article supplémentaire</h3>
            <button
              type="button"
              onClick={() => setIsAddingItem(false)}
              className="text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
            <input
              type="text"
              required
              placeholder="Nom de l'article (ex: Café, Essuie-tout, Biscuits)..."
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              className="sm:col-span-2 px-3.5 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm outline-none focus:ring-2 focus:ring-orange-500/20"
            />
            <div className="flex gap-1.5">
              <input
                type="text"
                placeholder="Qté (ex: 2)"
                value={newItemAmount}
                onChange={(e) => setNewItemAmount(e.target.value)}
                className="w-1/2 px-3 py-2 rounded-xl border border-slate-200 text-xs text-center outline-none"
              />
              <input
                type="text"
                placeholder="Unité (ex: paquets)"
                value={newItemUnit}
                onChange={(e) => setNewItemUnit(e.target.value)}
                className="w-1/2 px-3 py-2 rounded-xl border border-slate-200 text-xs text-center outline-none"
              />
            </div>
            <select
              value={newItemCategory}
              onChange={(e) => setNewItemCategory(e.target.value as GroceryCategory)}
              className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-700"
            >
              {GROCERY_CATEGORIES.map(cat => (
                <option key={cat.name} value={cat.name}>
                  {cat.icon} {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 mt-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsAddingItem(false)}
              className="px-3 py-1.5 rounded-xl text-xs font-medium text-slate-500 hover:bg-slate-100"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-xl text-xs font-bold bg-orange-600 hover:bg-orange-700 text-white shadow-xs"
            >
              Ajouter à la liste
            </button>
          </div>
        </form>
      )}

      {/* Empty State */}
      {totalCount === 0 && (
        <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200/80 text-center space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-orange-100 text-orange-600 flex items-center justify-center text-3xl mx-auto shadow-inner">
            🛒
          </div>
          <div>
            <h3 className="font-extrabold text-lg text-slate-800">
              Votre liste de courses est vide
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto mt-1 leading-relaxed">
              Planifiez vos repas dans l'onglet <strong>Planning Semaine</strong> puis cliquez sur <strong>"Regénérer"</strong>, ou ajoutez des articles manuellement !
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <button
              onClick={() => onRegenerateFromPlan({ resetAll: true })}
              className="px-5 py-2.5 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-orange-600/20 transition-all flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>Générer depuis le planning</span>
            </button>
            <button
              onClick={() => setIsAddingItem(true)}
              className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs sm:text-sm transition-colors"
            >
              + Ajouter un article manuel
            </button>
          </div>
        </div>
      )}

      {/* Grouped Items by Supermarket Category */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {GROCERY_CATEGORIES.map(cat => {
          const catItems = items.filter(i => (i.category || 'Épicerie & Féculents') === cat.name);
          if (catItems.length === 0) return null;

          const catChecked = catItems.filter(i => i.checked).length;

          return (
            <div
              key={cat.name}
              className="bg-white rounded-3xl border border-slate-200/80 p-4 sm:p-5 shadow-2xs space-y-3"
            >
              {/* Category Header */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{cat.icon}</span>
                  <h3 className="font-bold text-slate-800 text-sm">{cat.name}</h3>
                </div>
                <span className="text-[11px] font-semibold text-slate-400">
                  {catChecked} / {catItems.length}
                </span>
              </div>

              {/* Items List */}
              <div className="space-y-1.5">
                {catItems.map(item => (
                  <div
                    key={item.id}
                    onClick={() => handleToggleCheck(item.id)}
                    className={`flex items-center justify-between p-2.5 rounded-2xl cursor-pointer transition-all border ${
                      item.checked
                        ? 'bg-slate-50/80 border-slate-100 opacity-55'
                        : 'bg-white hover:bg-orange-50/50 border-slate-100 hover:border-orange-100 shadow-3xs'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div
                        className={`w-5 h-5 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                          item.checked
                            ? 'bg-emerald-500 text-white'
                            : 'border-2 border-slate-300 bg-white'
                        }`}
                      >
                        {item.checked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>

                      <div className="min-w-0">
                        <p className={`text-xs sm:text-sm font-semibold truncate ${item.checked ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                          {item.name}
                        </p>
                        {item.recipeSourceTitle && (
                          <p className="text-[10px] text-slate-400 truncate">
                            Pour: {item.recipeSourceTitle}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {(item.amount || item.unit) && (
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                          item.checked
                            ? 'bg-slate-100 text-slate-400 line-through'
                            : 'bg-orange-50 text-orange-700'
                        }`}>
                          {item.amount} {item.unit}
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteItem(item.id);
                        }}
                        className="text-slate-300 hover:text-rose-500 p-1 transition-colors"
                        title="Supprimer cet article"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL 1: Ingrédients du placard (Personnalisable) */}
      {isPantryModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
          onClick={() => setIsPantryModalOpen(false)}
        >
          <div
            className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-5 sm:p-6 shadow-2xl border border-slate-100 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">🧂</span>
                <div>
                  <h3 className="font-bold text-slate-900 text-base sm:text-lg">
                    Ingrédients du placard (Exclus)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Ces ingrédients ne seront pas ajoutés aux courses
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPantryModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Info notice */}
            <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200/70 text-xs text-amber-900 flex items-start gap-2.5">
              <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                Les ingrédients listés ici sont considérés comme toujours présents dans votre cuisine (sel, poivre, eau, huile d'olive...). Lorsque vous générez votre liste depuis vos recettes, ils seront automatiquement filtrés.
              </p>
            </div>

            {/* Input to add new staple */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                Ajouter un ingrédient à exclure :
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newStapleInput}
                  onChange={(e) => setNewStapleInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddStaple(newStapleInput);
                    }
                  }}
                  placeholder="Ex: cannelle, sauce soja, maïzena, paprika..."
                  className="flex-1 px-3.5 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                />
                <button
                  type="button"
                  onClick={() => handleAddStaple(newStapleInput)}
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold shadow-xs active:scale-95 transition-all"
                >
                  Ajouter
                </button>
              </div>
            </div>

            {/* Active Staples Chips */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">
                  Ingrédients exclus actuellement ({pantryStaples.length}) :
                </span>
                {pantryStaples.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearAllStaples}
                    className="text-[11px] font-semibold text-rose-600 hover:underline"
                  >
                    Tout vider
                  </button>
                )}
              </div>

              {pantryStaples.length === 0 ? (
                <p className="text-xs text-slate-400 italic p-3 bg-slate-50 rounded-xl text-center">
                  Aucun ingrédient exclu. Tous les ingrédients des recettes seront ajoutés à la liste de courses.
                </p>
              ) : (
                <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto p-1">
                  {pantryStaples.map((staple) => (
                    <span
                      key={staple}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold bg-amber-100/80 text-amber-900 border border-amber-200/60 shadow-2xs"
                    >
                      <span className="capitalize">{staple}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveStaple(staple)}
                        className="text-amber-700 hover:text-rose-600 font-bold ml-0.5"
                        title={`Supprimer "${staple}" des exclusions`}
                      >
                        &times;
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Suggestions */}
            <div className="space-y-1.5 pt-2 border-t border-slate-100">
              <span className="text-xs font-semibold text-slate-500">
                Suggestions rapides à ajouter en 1 clic :
              </span>
              <div className="flex flex-wrap gap-1.5">
                {COMMON_PANTRY_SUGGESTIONS.filter(s => !pantryStaples.includes(s)).slice(0, 8).map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => handleAddStaple(s)}
                    className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 hover:bg-orange-100 hover:text-orange-800 text-slate-600 transition-colors"
                  >
                    + {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Footer Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={handleResetDefaultStaples}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-orange-600"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Rétablir liste recommandée</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsPantryModalOpen(false);
                  onRegenerateFromPlan({ resetAll: false });
                }}
                className="w-full sm:w-auto px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold shadow-md shadow-orange-600/20 transition-all"
              >
                Enregistrer & Appliquer à la liste
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Confirmation Vider la liste */}
      {showClearConfirmModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setShowClearConfirmModal(false)}
        >
          <div
            className="bg-white rounded-3xl max-w-sm w-full p-5 sm:p-6 shadow-2xl border border-slate-100 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="text-base sm:text-lg font-bold text-slate-900">
                Vider la liste de courses ?
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed">
                Êtes-vous certain de vouloir supprimer l'intégralité des <strong>{totalCount} articles</strong> ? Vous pourrez la regénérer depuis le planning à tout moment.
              </p>
            </div>
            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowClearConfirmModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs sm:text-sm transition-colors"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowClearConfirmModal(false);
                  onClearGroceryList();
                }}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-rose-600/20 active:scale-95 transition-all"
              >
                Oui, tout vider
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Confirmation Regénérer la liste */}
      {showRegenerateModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setShowRegenerateModal(false)}
        >
          <div
            className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-100 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center mx-auto">
              <RefreshCw className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="text-base sm:text-lg font-bold text-slate-900">
                Regénérer la liste de courses
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed">
                Les ingrédients des recettes planifiées cette semaine seront recalculés en filtrant vos {pantryStaples.length} ingrédients de base.
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowRegenerateModal(false);
                  onRegenerateFromPlan({ resetAll: true });
                }}
                className="w-full p-3 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white text-left font-bold text-xs sm:text-sm shadow-md shadow-orange-600/20 transition-all flex items-center justify-between"
              >
                <div>
                  <div className="font-bold">Regénérer à neuf (Remplacer tout)</div>
                  <div className="text-[11px] font-normal opacity-90">Efface la liste actuelle et re-crée tous les ingrédients requis</div>
                </div>
                <span>&rarr;</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowRegenerateModal(false);
                  onRegenerateFromPlan({ resetAll: false });
                }}
                className="w-full p-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-left font-semibold text-xs sm:text-sm transition-all flex items-center justify-between"
              >
                <div>
                  <div className="font-bold">Actualiser (Conserver ajouts manuels)</div>
                  <div className="text-[11px] font-normal text-slate-500">Met à jour les recettes sans effacer vos articles personnalisés</div>
                </div>
                <span>&rarr;</span>
              </button>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowRegenerateModal(false)}
                className="w-full py-2.5 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100 transition-colors"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
