import React, { useState } from 'react';
import {
  X,
  Clock,
  Users,
  Plus,
  Minus,
  ChefHat,
  Heart,
  CalendarPlus,
  Edit,
  Trash2,
  ExternalLink,
  MessageSquare,
  Check,
  Tag,
  Star,
  ChevronUp,
  ChevronDown,
  GripVertical,
  ArrowUpDown
} from 'lucide-react';
import { Recipe, InstructionStep, PRESET_CATEGORIES } from '../types/recipe';
import { CookingModeModal } from './CookingModeModal';

interface RecipeDetailModalProps {
  recipe: Recipe | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (recipe: Recipe) => void;
  onDelete: (recipeId: string) => void;
  onUpdateRecipe: (updated: Recipe) => void;
  onAddToPlan: (recipe: Recipe, servings: number) => void;
}

export const RecipeDetailModal: React.FC<RecipeDetailModalProps> = ({
  recipe,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  onUpdateRecipe,
  onAddToPlan,
}) => {
  if (!isOpen || !recipe) return null;

  const [currentServings, setCurrentServings] = useState(recipe.servings || 4);
  const [checkedIngredients, setCheckedIngredients] = useState<Record<string, boolean>>({});
  const [isCookingModeOpen, setIsCookingModeOpen] = useState(false);
  const [isEditingComments, setIsEditingComments] = useState(false);
  const [commentsDraft, setCommentsDraft] = useState(recipe.comments || '');
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [newTagInput, setNewTagInput] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Preparation steps quick organize / insert state
  const [isManagingSteps, setIsManagingSteps] = useState(false);
  const [insertStepAtIndex, setInsertStepAtIndex] = useState<number | null>(null);
  const [newStepText, setNewStepText] = useState('');
  const [newStepDuration, setNewStepDuration] = useState('');
  const [draggedStepIdx, setDraggedStepIdx] = useState<number | null>(null);
  const [dragOverStepIdx, setDragOverStepIdx] = useState<number | null>(null);

  const baseServings = recipe.servings || 4;
  const scale = currentServings / baseServings;
  const totalTime = (recipe.prepTimeMinutes || 0) + (recipe.cookTimeMinutes || 0);

  const persistInstructions = (nextSteps: InstructionStep[]) => {
    const renumbered = nextSteps.map((s, i) => ({
      ...s,
      stepNumber: i + 1,
    }));
    onUpdateRecipe({
      ...recipe,
      instructions: renumbered,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleMoveStep = (fromIdx: number, toIdx: number) => {
    const list = [...(recipe.instructions || [])];
    if (toIdx < 0 || toIdx >= list.length || fromIdx === toIdx) return;
    const [moved] = list.splice(fromIdx, 1);
    list.splice(toIdx, 0, moved);
    persistInstructions(list);
  };

  const handleConfirmInsertStep = () => {
    if (insertStepAtIndex === null || !newStepText.trim()) return;
    const list = [...(recipe.instructions || [])];
    const parsedDur = newStepDuration.trim() ? Number(newStepDuration) : undefined;
    list.splice(insertStepAtIndex, 0, {
      stepNumber: insertStepAtIndex + 1,
      text: newStepText.trim(),
      durationMinutes: parsedDur && parsedDur > 0 ? parsedDur : undefined,
    });
    persistInstructions(list);
    setInsertStepAtIndex(null);
    setNewStepText('');
    setNewStepDuration('');
  };

  const handleDeleteStep = (idx: number) => {
    const list = [...(recipe.instructions || [])];
    if (list.length <= 1) return;
    list.splice(idx, 1);
    persistInstructions(list);
  };

  const toggleIngredientCheck = (id: string) => {
    setCheckedIngredients(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSaveComments = () => {
    const updated: Recipe = {
      ...recipe,
      comments: commentsDraft,
      updatedAt: new Date().toISOString(),
    };
    onUpdateRecipe(updated);
    setIsEditingComments(false);
  };

  const handleAddCategory = (categoryName: string) => {
    const clean = categoryName.trim().toLowerCase();
    if (!clean) return;
    if (recipe.categories?.includes(clean)) return;

    const nextCats = [...(recipe.categories || []), clean];
    const updated: Recipe = {
      ...recipe,
      categories: nextCats,
      updatedAt: new Date().toISOString(),
    };
    onUpdateRecipe(updated);
    setNewTagInput('');
    setIsAddingTag(false);
  };

  const handleRemoveCategory = (catToRemove: string) => {
    const nextCats = (recipe.categories || []).filter(c => c !== catToRemove);
    const updated: Recipe = {
      ...recipe,
      categories: nextCats,
      updatedAt: new Date().toISOString(),
    };
    onUpdateRecipe(updated);
  };

  const handleToggleFavorite = () => {
    const updated: Recipe = {
      ...recipe,
      favorite: !recipe.favorite,
      updatedAt: new Date().toISOString(),
    };
    onUpdateRecipe(updated);
  };

  const handleSetRating = (ratingValue: number) => {
    const updated: Recipe = {
      ...recipe,
      rating: recipe.rating === ratingValue ? 0 : ratingValue,
      updatedAt: new Date().toISOString(),
    };
    onUpdateRecipe(updated);
  };

  return (
    <>
      <div className="fixed inset-0 z-45 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
        <div
          className="bg-white rounded-3xl max-w-3xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-100 flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header Image & Action Bar */}
          <div className="relative aspect-16/9 sm:aspect-21/9 w-full bg-slate-900 shrink-0">
            {recipe.imageUrl ? (
              <img
                src={recipe.imageUrl}
                alt={recipe.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-linear-to-r from-orange-400 to-amber-500 text-white">
                <ChefHat className="w-16 h-16 opacity-80" />
              </div>
            )}
            <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/30 to-black/30" />

            {/* Top Buttons */}
            <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
              <button
                onClick={handleToggleFavorite}
                className={`w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-md transition-all ${
                  recipe.favorite
                    ? 'bg-rose-500 text-white shadow-lg'
                    : 'bg-black/40 text-white hover:bg-black/60'
                }`}
              >
                <Heart className={`w-5 h-5 ${recipe.favorite ? 'fill-current' : ''}`} />
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => onEdit(recipe)}
                  className="w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center backdrop-blur-md transition-colors"
                  title="Modifier la recette"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-10 h-10 rounded-full bg-black/40 hover:bg-rose-600 text-white flex items-center justify-center backdrop-blur-md transition-colors"
                  title="Supprimer la recette"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center backdrop-blur-md transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Title & Badges in Hero */}
            <div className="absolute bottom-4 left-4 right-4 text-white">
              <div className="flex flex-wrap items-center gap-1.5 mb-2">
                {recipe.categories?.map((cat) => {
                  const isVeg = cat.toLowerCase().includes('végétar');
                  const isQuick = cat.toLowerCase().includes('rapide');
                  return (
                    <span
                      key={cat}
                      className={`px-2.5 py-0.5 rounded-full text-xs font-bold inline-flex items-center gap-1 shadow-xs ${
                        isVeg
                          ? 'bg-emerald-500 text-white'
                          : isQuick
                          ? 'bg-amber-500 text-white'
                          : 'bg-white/25 backdrop-blur-xs text-white'
                      }`}
                    >
                      {isVeg && '🌱'}
                      {isQuick && '⚡'}
                      <span className="capitalize">{cat}</span>
                    </span>
                  );
                })}
              </div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white leading-tight">
                {recipe.title}
              </h1>
            </div>
          </div>

          {/* Modal Content */}
          <div className="p-4 sm:p-6 space-y-6">
            {/* Meta Row: Times, Servings, Rating */}
            <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <div className="flex items-center gap-6">
                <div>
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Préparation</p>
                  <p className="text-sm font-bold text-slate-800 flex items-center gap-1 mt-0.5">
                    <Clock className="w-3.5 h-3.5 text-orange-500" />
                    <span>{recipe.prepTimeMinutes || 0} min</span>
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Cuisson</p>
                  <p className="text-sm font-bold text-slate-800 flex items-center gap-1 mt-0.5">
                    <Clock className="w-3.5 h-3.5 text-amber-500" />
                    <span>{recipe.cookTimeMinutes || 0} min</span>
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total</p>
                  <p className="text-sm font-bold text-orange-600 mt-0.5">
                    {totalTime} min
                  </p>
                </div>
              </div>

              {/* Rating Star selector */}
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => handleSetRating(star)}
                    className="p-1 hover:scale-110 transition-transform"
                    title={`Noter ${star}/5`}
                  >
                    <Star
                      className={`w-4 h-4 ${
                        (recipe.rating || 0) >= star
                          ? 'text-amber-400 fill-amber-400'
                          : 'text-slate-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Source URL if imported */}
            {recipe.sourceUrl && (
              <div className="flex items-center gap-2 text-xs text-slate-500 bg-orange-50/50 p-2.5 rounded-xl border border-orange-100/60">
                <span>Importée depuis :</span>
                <a
                  href={recipe.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-orange-700 hover:underline flex items-center gap-1 truncate max-w-sm"
                >
                  <span className="truncate">{recipe.sourceUrl}</span>
                  <ExternalLink className="w-3 h-3 shrink-0" />
                </a>
              </div>
            )}

            {/* Quick Action Buttons: Cooking Mode + Plan */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={() => setIsCookingModeOpen(true)}
                className="py-3 px-4 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-bold flex items-center justify-center gap-2 text-sm shadow-md shadow-orange-600/20 active:scale-98 transition-all"
              >
                <ChefHat className="w-4 h-4" />
                <span>Mode Cuisine (Grand écran)</span>
              </button>

              <button
                onClick={() => onAddToPlan(recipe, currentServings)}
                className="py-3 px-4 rounded-2xl bg-orange-50 hover:bg-orange-100 border border-orange-200 text-orange-800 font-bold flex items-center justify-center gap-2 text-sm active:scale-98 transition-all"
              >
                <CalendarPlus className="w-4 h-4 text-orange-600" />
                <span>Ajouter au planning de la semaine</span>
              </button>
            </div>

            {/* Category Tags Manager */}
            <div className="border border-slate-200/80 rounded-2xl p-4 bg-white">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-orange-600" />
                  <h3 className="font-bold text-slate-800 text-sm">Catégories & Étiquettes</h3>
                </div>
                <button
                  onClick={() => setIsAddingTag(!isAddingTag)}
                  className="text-xs font-semibold text-orange-600 hover:text-orange-700"
                >
                  {isAddingTag ? 'Fermer' : '+ Gérer catégories'}
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5 items-center">
                {recipe.categories?.map((cat) => (
                  <span
                    key={cat}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700"
                  >
                    <span className="capitalize">{cat}</span>
                    <button
                      onClick={() => handleRemoveCategory(cat)}
                      className="hover:text-rose-500 text-slate-400 font-bold"
                      title="Retirer cette catégorie"
                    >
                      &times;
                    </button>
                  </span>
                ))}

                {isAddingTag && (
                  <div className="w-full mt-3 pt-3 border-t border-slate-100 space-y-2">
                    <p className="text-xs text-slate-500 font-medium">Suggestions rapides :</p>
                    <div className="flex flex-wrap gap-1.5">
                      {PRESET_CATEGORIES.filter(c => !recipe.categories?.includes(c)).map(cat => (
                        <button
                          key={cat}
                          onClick={() => handleAddCategory(cat)}
                          className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 hover:bg-orange-100 hover:text-orange-800 text-slate-600 transition-colors"
                        >
                          + {cat}
                        </button>
                      ))}
                    </div>

                    <div className="flex gap-2 mt-2">
                      <input
                        type="text"
                        value={newTagInput}
                        onChange={(e) => setNewTagInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddCategory(newTagInput);
                          }
                        }}
                        placeholder="Autre catégorie personnalisée..."
                        className="flex-1 px-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none"
                      />
                      <button
                        onClick={() => handleAddCategory(newTagInput)}
                        className="px-3 py-1.5 bg-orange-600 text-white rounded-xl text-xs font-semibold"
                      >
                        Ajouter
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Ingredients with Dynamic Portion Scaler */}
            <div className="border border-slate-200/80 rounded-2xl p-4 sm:p-5 bg-white">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-slate-800 text-base">Ingrédients</h3>
                  <span className="text-xs text-slate-400">({recipe.ingredients?.length || 0})</span>
                </div>

                {/* Servings Scaler */}
                <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-2xl border border-slate-200">
                  <Users className="w-4 h-4 text-orange-600" />
                  <span className="text-xs font-semibold text-slate-600">Portions :</span>
                  <button
                    onClick={() => setCurrentServings(prev => Math.max(1, prev - 1))}
                    className="w-6 h-6 rounded-lg bg-white hover:bg-slate-200 border border-slate-200 flex items-center justify-center text-slate-700 font-bold transition-colors"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="font-bold text-sm text-slate-800 w-5 text-center">
                    {currentServings}
                  </span>
                  <button
                    onClick={() => setCurrentServings(prev => prev + 1)}
                    className="w-6 h-6 rounded-lg bg-white hover:bg-slate-200 border border-slate-200 flex items-center justify-center text-slate-700 font-bold transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Ingredient Checklist */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {recipe.ingredients?.map((ing) => {
                  const isChecked = !!checkedIngredients[ing.id];
                  let numericAmount = typeof ing.amount === 'number' ? ing.amount : parseFloat(String(ing.amount)) || 0;
                  const scaledVal = numericAmount > 0 ? Math.round(numericAmount * scale * 10) / 10 : ing.amount;

                  return (
                    <div
                      key={ing.id}
                      onClick={() => toggleIngredientCheck(ing.id)}
                      className={`flex items-start gap-2.5 p-2.5 rounded-xl cursor-pointer transition-all border ${
                        isChecked
                          ? 'bg-slate-50 border-slate-100 opacity-60'
                          : 'bg-white hover:bg-orange-50/50 border-slate-100 hover:border-orange-100'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-md flex items-center justify-center mt-0.5 shrink-0 transition-colors ${
                          isChecked
                            ? 'bg-emerald-500 text-white'
                            : 'border border-slate-300 bg-white'
                        }`}
                      >
                        {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className={`text-xs sm:text-sm font-medium ${isChecked ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                          {scaledVal && <strong className="text-orange-700">{scaledVal} {ing.unit} </strong>}
                          <span>{ing.name}</span>
                        </p>
                        {ing.category && (
                          <span className="text-[10px] text-slate-400 capitalize">
                            {ing.category}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Preparation Steps */}
            <div className="border border-slate-200/80 rounded-2xl p-4 sm:p-5 bg-white">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-slate-800 text-base">Instructions de préparation</h3>
                  <span className="text-xs text-slate-400">({recipe.instructions?.length || 0})</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsManagingSteps(true);
                      setInsertStepAtIndex(recipe.instructions?.length || 0);
                      setNewStepText('');
                      setNewStepDuration('');
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold bg-orange-50 hover:bg-orange-100 text-orange-700 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Ajouter étape</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsManagingSteps((prev) => {
                        if (prev) {
                          setInsertStepAtIndex(null);
                          setNewStepText('');
                          setNewStepDuration('');
                        }
                        return !prev;
                      });
                    }}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold transition-colors ${
                      isManagingSteps
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    <ArrowUpDown className="w-3.5 h-3.5" />
                    <span>{isManagingSteps ? 'Terminer' : 'Réorganiser'}</span>
                  </button>
                </div>
              </div>

              {isManagingSteps && (
                <div className="mb-3 p-2.5 rounded-xl bg-orange-50/70 border border-orange-200/70 flex flex-wrap items-center justify-between gap-2 text-xs text-orange-900">
                  <span>
                    Utilisez les flèches <strong>↑ ↓</strong> (ou glissez-déposez) pour déplacer une étape, ou cliquez sur <strong>+ Insérer</strong> à l’endroit souhaité.
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setInsertStepAtIndex(0);
                      setNewStepText('');
                      setNewStepDuration('');
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white hover:bg-orange-100 border border-orange-200 text-orange-700 font-bold text-[11px] shrink-0"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Insérer au début</span>
                  </button>
                </div>
              )}

              {/* Inline Insert Box at Position 0 */}
              {insertStepAtIndex === 0 && (
                <div className="mb-4 p-3.5 rounded-2xl bg-orange-50/80 border border-orange-300 space-y-2.5">
                  <p className="text-xs font-bold text-orange-900">
                    Nouvelle étape en position #1 :
                  </p>
                  <textarea
                    rows={2}
                    autoFocus
                    value={newStepText}
                    onChange={(e) => setNewStepText(e.target.value)}
                    placeholder="Décrivez cette nouvelle étape de préparation..."
                    className="w-full p-2.5 rounded-xl bg-white border border-orange-200 text-xs sm:text-sm text-slate-800 outline-none focus:ring-2 focus:ring-orange-500/20"
                  />
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <input
                        type="number"
                        min="0"
                        value={newStepDuration}
                        onChange={(e) => setNewStepDuration(e.target.value)}
                        placeholder="Temps (min, optionnel)"
                        className="w-40 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-xs"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setInsertStepAtIndex(null)}
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-white"
                      >
                        Annuler
                      </button>
                      <button
                        type="button"
                        onClick={handleConfirmInsertStep}
                        disabled={!newStepText.trim()}
                        className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-orange-600 hover:bg-orange-700 disabled:opacity-40 text-white"
                      >
                        Insérer l’étape
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {recipe.instructions?.map((step, idx) => {
                  const isDragged = draggedStepIdx === idx;
                  const isDragTarget = dragOverStepIdx === idx && draggedStepIdx !== null && draggedStepIdx !== idx;

                  return (
                    <React.Fragment key={`${idx}-${step.stepNumber}`}>
                      <div
                        draggable={isManagingSteps}
                        onDragStart={
                          isManagingSteps
                            ? (e) => {
                                setDraggedStepIdx(idx);
                                e.dataTransfer.effectAllowed = 'move';
                                e.dataTransfer.setData('text/plain', String(idx));
                              }
                            : undefined
                        }
                        onDragOver={
                          isManagingSteps
                            ? (e) => {
                                e.preventDefault();
                                if (dragOverStepIdx !== idx) setDragOverStepIdx(idx);
                              }
                            : undefined
                        }
                        onDrop={
                          isManagingSteps
                            ? (e) => {
                                e.preventDefault();
                                if (draggedStepIdx !== null && draggedStepIdx !== idx) {
                                  handleMoveStep(draggedStepIdx, idx);
                                }
                                setDraggedStepIdx(null);
                                setDragOverStepIdx(null);
                              }
                            : undefined
                        }
                        onDragEnd={() => {
                          setDraggedStepIdx(null);
                          setDragOverStepIdx(null);
                        }}
                        className={`flex items-start gap-3 transition-all ${
                          isManagingSteps
                            ? `p-3 rounded-2xl border ${
                                isDragged
                                  ? 'opacity-50 bg-orange-50 border-orange-300'
                                  : isDragTarget
                                  ? 'bg-orange-50/70 border-orange-400 ring-2 ring-orange-400/30'
                                  : 'bg-slate-50/80 border-slate-200/80'
                              }`
                            : ''
                        }`}
                      >
                        {isManagingSteps && (
                          <div className="text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing pt-1 hidden sm:block">
                            <GripVertical className="w-4 h-4" />
                          </div>
                        )}

                        <div className="w-7 h-7 rounded-full bg-orange-100 text-orange-700 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                          {step.stepNumber || idx + 1}
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                            {step.text}
                          </p>
                          {step.durationMinutes && (
                            <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md mt-1.5">
                              <Clock className="w-3 h-3" />
                              <span>Temps conseillé : {step.durationMinutes} min</span>
                            </div>
                          )}

                          {isManagingSteps && (
                            <div className="mt-2 pt-2 border-t border-slate-200/70 flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleMoveStep(idx, idx - 1)}
                                  disabled={idx === 0}
                                  className="inline-flex items-center gap-0.5 px-2 py-1 rounded-lg bg-white border border-slate-200 hover:border-orange-300 hover:text-orange-700 disabled:opacity-30 text-[11px] font-semibold text-slate-600 transition-colors"
                                  title="Monter cette étape"
                                >
                                  <ChevronUp className="w-3.5 h-3.5" />
                                  <span>Monter</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleMoveStep(idx, idx + 1)}
                                  disabled={idx === (recipe.instructions?.length || 1) - 1}
                                  className="inline-flex items-center gap-0.5 px-2 py-1 rounded-lg bg-white border border-slate-200 hover:border-orange-300 hover:text-orange-700 disabled:opacity-30 text-[11px] font-semibold text-slate-600 transition-colors"
                                  title="Descendre cette étape"
                                >
                                  <ChevronDown className="w-3.5 h-3.5" />
                                  <span>Descendre</span>
                                </button>
                              </div>

                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setInsertStepAtIndex(idx + 1);
                                    setNewStepText('');
                                    setNewStepDuration('');
                                  }}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-orange-50 hover:bg-orange-100 border border-orange-200/70 text-orange-700 text-[11px] font-semibold transition-colors"
                                >
                                  <Plus className="w-3 h-3" />
                                  <span>Insérer après</span>
                                </button>

                                {(recipe.instructions?.length || 0) > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteStep(idx)}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                    title="Supprimer cette étape"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Inline Insert Box after this step */}
                      {insertStepAtIndex === idx + 1 && (
                        <div className="p-3.5 rounded-2xl bg-orange-50/80 border border-orange-300 space-y-2.5">
                          <p className="text-xs font-bold text-orange-900">
                            Nouvelle étape en position #{idx + 2} :
                          </p>
                          <textarea
                            rows={2}
                            autoFocus
                            value={newStepText}
                            onChange={(e) => setNewStepText(e.target.value)}
                            placeholder="Décrivez cette nouvelle étape de préparation..."
                            className="w-full p-2.5 rounded-xl bg-white border border-orange-200 text-xs sm:text-sm text-slate-800 outline-none focus:ring-2 focus:ring-orange-500/20"
                          />
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                              <input
                                type="number"
                                min="0"
                                value={newStepDuration}
                                onChange={(e) => setNewStepDuration(e.target.value)}
                                placeholder="Temps (min, optionnel)"
                                className="w-40 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-xs"
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setInsertStepAtIndex(null)}
                                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-white"
                              >
                                Annuler
                              </button>
                              <button
                                type="button"
                                onClick={handleConfirmInsertStep}
                                disabled={!newStepText.trim()}
                                className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-orange-600 hover:bg-orange-700 disabled:opacity-40 text-white"
                              >
                                Insérer l’étape
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>

            {/* User Notes & Comments (personnaliser avec commentaires) */}
            <div className="border border-amber-200/80 rounded-2xl p-4 sm:p-5 bg-amber-50/40">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-amber-700" />
                  <h3 className="font-bold text-amber-900 text-sm">Mes remarques & astuces personnelles</h3>
                </div>
                {!isEditingComments && (
                  <button
                    onClick={() => setIsEditingComments(true)}
                    className="text-xs font-semibold text-amber-800 hover:text-amber-900 hover:underline"
                  >
                    {recipe.comments ? 'Modifier la note' : '+ Ajouter une note'}
                  </button>
                )}
              </div>

              {isEditingComments ? (
                <div className="space-y-2 mt-2">
                  <textarea
                    value={commentsDraft}
                    onChange={(e) => setCommentsDraft(e.target.value)}
                    rows={3}
                    placeholder="Ex: Remplacer le vin blanc par du jus de citron, ajouter une pincée de piment, cuire 2 min de moins..."
                    className="w-full p-3 rounded-xl bg-white border border-amber-300 text-xs sm:text-sm text-slate-800 outline-none focus:ring-2 focus:ring-amber-500/20"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => {
                        setCommentsDraft(recipe.comments || '');
                        setIsEditingComments(false);
                      }}
                      className="px-3 py-1.5 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={handleSaveComments}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white shadow-xs"
                    >
                      Enregistrer la note
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-xs sm:text-sm text-slate-700 italic leading-relaxed">
                  {recipe.comments || 'Aucun commentaire ou astuce ajoutée pour l\'instant. Cliquez sur modifier pour en attacher un !'}
                </p>
              )}
            </div>

            {/* Bottom Destructive Action */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                Recette #{recipe.id.slice(-6)}
              </span>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Supprimer cette recette</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* In-App Delete Confirmation Modal (avoids window.confirm failure in iframe) */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className="bg-white rounded-3xl max-w-sm w-full p-5 sm:p-6 shadow-2xl border border-slate-100 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="text-base sm:text-lg font-bold text-slate-900">
                Supprimer la recette ?
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed">
                Êtes-vous certain de vouloir supprimer <strong>« {recipe.title} »</strong> ? Cette action est irréversible.
              </p>
            </div>
            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs sm:text-sm transition-colors"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  onDelete(recipe.id);
                  onClose();
                }}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-rose-600/20 active:scale-95 transition-all"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cooking Mode Modal */}
      {isCookingModeOpen && (
        <CookingModeModal
          recipe={recipe}
          servings={currentServings}
          isOpen={isCookingModeOpen}
          onClose={() => setIsCookingModeOpen(false)}
        />
      )}
    </>
  );
};
