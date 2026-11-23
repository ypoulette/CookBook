import React, { useState, useRef } from 'react';
import {
  X,
  Plus,
  Trash2,
  Clock,
  Users,
  Tag,
  MessageSquare,
  Image,
  Sparkles,
  ChevronUp,
  ChevronDown,
  GripVertical,
  AlertCircle,
} from 'lucide-react';
import { Recipe, Ingredient, InstructionStep, GROCERY_CATEGORIES, PRESET_CATEGORIES, GroceryCategory } from '../types/recipe';

interface RecipeEditorModalProps {
  recipe: Recipe | null; // null if creating new
  isOpen: boolean;
  onClose: () => void;
  onSave: (recipe: Recipe) => void;
  currentUserId: string;
}

interface EditableStep extends InstructionStep {
  uid: string;
}

const makeStepUid = () => `step_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

export const RecipeEditorModal: React.FC<RecipeEditorModalProps> = ({
  recipe,
  isOpen,
  onClose,
  onSave,
  currentUserId,
}) => {
  if (!isOpen) return null;

  const isEditing = !!recipe;

  const [title, setTitle] = useState(recipe?.title || '');
  const [description, setDescription] = useState(recipe?.description || '');
  const [prepTimeMinutes, setPrepTimeMinutes] = useState(recipe?.prepTimeMinutes || 15);
  const [cookTimeMinutes, setCookTimeMinutes] = useState(recipe?.cookTimeMinutes || 20);
  const [servings, setServings] = useState(recipe?.servings || 4);
  const [imageUrl, setImageUrl] = useState(recipe?.imageUrl || '');
  const [sourceUrl, setSourceUrl] = useState(recipe?.sourceUrl || '');
  const [comments, setComments] = useState(recipe?.comments || '');
  const [categories, setCategories] = useState<string[]>(recipe?.categories || ['plat principal']);
  const [customTagInput, setCustomTagInput] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const [ingredients, setIngredients] = useState<Ingredient[]>(
    recipe?.ingredients?.length
      ? recipe.ingredients
      : [
          { id: 'ing_1', name: '', amount: '', unit: '', category: 'Fruits & Légumes' },
        ]
  );

  const [instructions, setInstructions] = useState<EditableStep[]>(() =>
    recipe?.instructions?.length
      ? recipe.instructions.map((s, idx) => ({
          ...s,
          stepNumber: idx + 1,
          uid: makeStepUid(),
        }))
      : [
          { uid: makeStepUid(), stepNumber: 1, text: '', durationMinutes: undefined },
        ]
  );

  // Drag-and-drop state for preparation steps
  const [draggedStepIndex, setDraggedStepIndex] = useState<number | null>(null);
  const [dragOverStepIndex, setDragOverStepIndex] = useState<number | null>(null);
  const stepTextareaRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});

  const renumberSteps = (steps: EditableStep[]): EditableStep[] =>
    steps.map((s, i) => ({ ...s, stepNumber: i + 1 }));

  const toggleCategory = (cat: string) => {
    const norm = cat.toLowerCase();
    if (categories.includes(norm)) {
      setCategories(categories.filter(c => c !== norm));
    } else {
      setCategories([...categories, norm]);
    }
  };

  const addCustomTag = () => {
    const trimmed = customTagInput.trim().toLowerCase();
    if (trimmed && !categories.includes(trimmed)) {
      setCategories([...categories, trimmed]);
      setCustomTagInput('');
    }
  };

  // Ingredients helpers
  const handleAddIngredient = () => {
    setIngredients([
      ...ingredients,
      {
        id: `ing_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: '',
        amount: '',
        unit: '',
        category: 'Épicerie & Féculents',
      },
    ]);
  };

  const handleUpdateIngredient = (index: number, field: keyof Ingredient, value: any) => {
    const next = [...ingredients];
    next[index] = { ...next[index], [field]: value };
    setIngredients(next);
  };

  const handleRemoveIngredient = (index: number) => {
    if (ingredients.length <= 1) return;
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  // Instructions helpers: insert at any index, move up/down, drag-and-drop, edit, remove
  const handleInsertStepAt = (insertIndex: number) => {
    const newUid = makeStepUid();
    const newStep: EditableStep = {
      uid: newUid,
      stepNumber: insertIndex + 1,
      text: '',
      durationMinutes: undefined,
    };
    const next = [...instructions];
    next.splice(insertIndex, 0, newStep);
    setInstructions(renumberSteps(next));

    // Focus the newly inserted step textarea on next tick
    setTimeout(() => {
      stepTextareaRefs.current[newUid]?.focus();
    }, 30);
  };

  const handleAddStep = () => {
    handleInsertStepAt(instructions.length);
  };

  const handleMoveStep = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= instructions.length || fromIndex === toIndex) return;
    const next = [...instructions];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    setInstructions(renumberSteps(next));
  };

  const handleUpdateStep = (index: number, text: string, duration?: number) => {
    const next = [...instructions];
    next[index] = { ...next[index], text, durationMinutes: duration };
    setInstructions(next);
  };

  const handleRemoveStep = (index: number) => {
    if (instructions.length <= 1) return;
    const filtered = instructions.filter((_, i) => i !== index);
    setInstructions(renumberSteps(filtered));
  };

  const handleStepDragStart = (index: number, e: React.DragEvent) => {
    setDraggedStepIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  };

  const handleStepDragOver = (index: number, e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverStepIndex !== index) {
      setDragOverStepIndex(index);
    }
  };

  const handleStepDrop = (targetIndex: number, e: React.DragEvent) => {
    e.preventDefault();
    if (draggedStepIndex !== null && draggedStepIndex !== targetIndex) {
      handleMoveStep(draggedStepIndex, targetIndex);
    }
    setDraggedStepIndex(null);
    setDragOverStepIndex(null);
  };

  const handleStepDragEnd = () => {
    setDraggedStepIndex(null);
    setDragOverStepIndex(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!title.trim()) {
      setFormError('Veuillez donner un nom à la recette.');
      return;
    }

    const cleanIngredients = ingredients
      .filter(i => i.name.trim().length > 0)
      .map(i => ({
        ...i,
        name: i.name.trim(),
        unit: i.unit.trim(),
      }));

    if (cleanIngredients.length === 0) {
      setFormError('Ajoutez au moins un ingrédient.');
      return;
    }

    const cleanInstructions = instructions
      .filter(s => s.text.trim().length > 0)
      .map((s, idx) => ({
        stepNumber: idx + 1,
        text: s.text.trim(),
        durationMinutes: s.durationMinutes ? Number(s.durationMinutes) : undefined,
      }));

    if (cleanInstructions.length === 0) {
      setFormError('Ajoutez au moins une étape de préparation.');
      return;
    }

    const recipeId = recipe?.id || `rec_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    const savedRecipe: Recipe = {
      id: recipeId,
      userId: recipe?.userId || currentUserId || 'default',
      title: title.trim(),
      description: description.trim(),
      prepTimeMinutes: Number(prepTimeMinutes) || 0,
      cookTimeMinutes: Number(cookTimeMinutes) || 0,
      servings: Number(servings) || 4,
      imageUrl: imageUrl.trim() || undefined,
      sourceUrl: sourceUrl.trim() || undefined,
      comments: comments.trim() || undefined,
      rating: recipe?.rating || 5,
      favorite: recipe?.favorite || false,
      categories: categories.length ? categories : ['plat principal'],
      ingredients: cleanIngredients,
      instructions: cleanInstructions,
      createdAt: recipe?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSave(savedRecipe);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white rounded-3xl max-w-3xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-100 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-md z-10">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">
              {isEditing ? 'Personnaliser la recette' : 'Créer une nouvelle recette'}
            </h2>
            <p className="text-xs text-slate-500">
              Modifiez les ingrédients, réorganisez ou insérez des étapes, et ajoutez vos notes.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-6">
          {formError && (
            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Title & Description */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Titre de la recette *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Risotto crémeux aux asperges & parmesan"
                className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Courte description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="Description appétissante, origines ou saveurs clés..."
                className="w-full px-4 py-2 rounded-2xl border border-slate-200 text-xs sm:text-sm text-slate-700 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none"
              />
            </div>
          </div>

          {/* Quick Metrics (Prep, Cook, Servings) */}
          <div className="grid grid-cols-3 gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-100">
            <div>
              <label className="flex items-center gap-1 text-[11px] font-bold text-slate-600 mb-1">
                <Clock className="w-3.5 h-3.5 text-orange-500" />
                <span>Prépa (min)</span>
              </label>
              <input
                type="number"
                min="0"
                value={prepTimeMinutes}
                onChange={(e) => setPrepTimeMinutes(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-sm font-bold text-slate-800"
              />
            </div>

            <div>
              <label className="flex items-center gap-1 text-[11px] font-bold text-slate-600 mb-1">
                <Clock className="w-3.5 h-3.5 text-amber-500" />
                <span>Cuisson (min)</span>
              </label>
              <input
                type="number"
                min="0"
                value={cookTimeMinutes}
                onChange={(e) => setCookTimeMinutes(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-sm font-bold text-slate-800"
              />
            </div>

            <div>
              <label className="flex items-center gap-1 text-[11px] font-bold text-slate-600 mb-1">
                <Users className="w-3.5 h-3.5 text-orange-500" />
                <span>Portions</span>
              </label>
              <input
                type="number"
                min="1"
                value={servings}
                onChange={(e) => setServings(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-sm font-bold text-slate-800"
              />
            </div>
          </div>

          {/* Categories / Tags ("végétarien", "rapide", etc.) */}
          <div className="border border-slate-200/80 rounded-2xl p-4 bg-white space-y-3">
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-orange-600" />
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Catégories &amp; Filtres (ex: Végétarien, Rapide)
              </label>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {PRESET_CATEGORIES.map((cat) => {
                const isSelected = categories.includes(cat.toLowerCase());
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
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : isQuick
                          ? 'bg-amber-500 text-white shadow-xs'
                          : 'bg-orange-600 text-white shadow-xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                    }`}
                  >
                    {isVeg && '🌱 '}
                    {isQuick && '⚡ '}
                    <span className="capitalize">{cat}</span>
                  </button>
                );
              })}
            </div>

            {/* Custom Tag input */}
            <div className="flex gap-2 pt-2 border-t border-slate-100">
              <input
                type="text"
                value={customTagInput}
                onChange={(e) => setCustomTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addCustomTag();
                  }
                }}
                placeholder="Ajouter une autre catégorie (ex: sans lactose)..."
                className="flex-1 px-3 py-1.5 rounded-xl border border-slate-200 text-xs outline-none focus:ring-2 focus:ring-orange-500/20"
              />
              <button
                type="button"
                onClick={addCustomTag}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl"
              >
                + Ajouter
              </button>
            </div>
          </div>

          {/* Ingredients Section */}
          <div className="border border-slate-200/80 rounded-2xl p-4 sm:p-5 bg-white space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-800 text-sm sm:text-base">Ingrédients</h3>
                <p className="text-[11px] text-slate-400">Classés par rayon pour générer la liste de courses</p>
              </div>
              <button
                type="button"
                onClick={handleAddIngredient}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-orange-50 hover:bg-orange-100 text-orange-700 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Ajouter ingrédient</span>
              </button>
            </div>

            <div className="space-y-2.5">
              {ingredients.map((ing, idx) => (
                <div key={ing.id} className="flex flex-wrap sm:flex-nowrap items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <input
                    type="text"
                    required
                    placeholder="Nom (ex: Farine, Oignons)"
                    value={ing.name}
                    onChange={(e) => handleUpdateIngredient(idx, 'name', e.target.value)}
                    className="flex-1 min-w-[140px] px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs sm:text-sm font-medium"
                  />
                  <input
                    type="text"
                    placeholder="Qté (ex: 200, 2)"
                    value={ing.amount}
                    onChange={(e) => handleUpdateIngredient(idx, 'amount', e.target.value)}
                    className="w-20 px-2 py-1.5 rounded-lg bg-white border border-slate-200 text-xs sm:text-sm text-center font-medium"
                  />
                  <input
                    type="text"
                    placeholder="Unité (g, ml, c.s.)"
                    value={ing.unit}
                    onChange={(e) => handleUpdateIngredient(idx, 'unit', e.target.value)}
                    className="w-24 px-2 py-1.5 rounded-lg bg-white border border-slate-200 text-xs sm:text-sm text-center font-medium"
                  />
                  <select
                    value={ing.category}
                    onChange={(e) => handleUpdateIngredient(idx, 'category', e.target.value as GroceryCategory)}
                    className="w-36 px-2 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-medium text-slate-700"
                  >
                    {GROCERY_CATEGORIES.map(cat => (
                      <option key={cat.name} value={cat.name}>
                        {cat.icon} {cat.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => handleRemoveIngredient(idx)}
                    className="w-8 h-8 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 flex items-center justify-center transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Instructions Steps (Reorderable + Insertable anywhere) */}
          <div className="border border-slate-200/80 rounded-2xl p-4 sm:p-5 bg-white space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="font-bold text-slate-800 text-sm sm:text-base">Étapes de préparation</h3>
                <p className="text-[11px] text-slate-400">
                  Glissez-déposez, utilisez les flèches ↑ ↓ pour déplacer, ou insérez une étape à tout endroit
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleInsertStepAt(0)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                  title="Insérer une nouvelle étape au tout début"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Au début</span>
                </button>
                <button
                  type="button"
                  onClick={handleAddStep}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-orange-50 hover:bg-orange-100 text-orange-700 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Ajouter étape</span>
                </button>
              </div>
            </div>

            <div className="space-y-2">
              {instructions.map((step, idx) => {
                const isDragged = draggedStepIndex === idx;
                const isDragTarget = dragOverStepIndex === idx && draggedStepIndex !== null && draggedStepIndex !== idx;

                return (
                  <React.Fragment key={step.uid}>
                    <div
                      draggable
                      onDragStart={(e) => handleStepDragStart(idx, e)}
                      onDragOver={(e) => handleStepDragOver(idx, e)}
                      onDrop={(e) => handleStepDrop(idx, e)}
                      onDragEnd={handleStepDragEnd}
                      className={`flex items-start gap-2 sm:gap-2.5 p-3 rounded-xl border transition-all ${
                        isDragged
                          ? 'opacity-50 bg-orange-50 border-orange-300 scale-[0.99]'
                          : isDragTarget
                          ? 'bg-orange-50/70 border-orange-400 ring-2 ring-orange-400/30'
                          : 'bg-slate-50 border-slate-100'
                      }`}
                    >
                      {/* Drag handle + Step Number + Up/Down Move Controls */}
                      <div className="flex flex-col items-center gap-1 shrink-0 pt-0.5">
                        <div
                          className="text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing p-0.5 hidden sm:block"
                          title="Glisser pour déplacer cette étape"
                        >
                          <GripVertical className="w-4 h-4" />
                        </div>
                        <div className="w-7 h-7 rounded-full bg-orange-600 text-white font-bold text-xs flex items-center justify-center">
                          {step.stepNumber}
                        </div>
                        <div className="flex flex-col gap-0.5 mt-0.5">
                          <button
                            type="button"
                            onClick={() => handleMoveStep(idx, idx - 1)}
                            disabled={idx === 0}
                            className="w-6 h-6 rounded-md bg-white border border-slate-200 hover:border-orange-300 hover:bg-orange-50 hover:text-orange-700 disabled:opacity-30 disabled:hover:bg-white disabled:hover:border-slate-200 disabled:hover:text-slate-400 text-slate-600 flex items-center justify-center transition-colors"
                            title="Monter cette étape"
                            aria-label={`Monter l'étape ${step.stepNumber}`}
                          >
                            <ChevronUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveStep(idx, idx + 1)}
                            disabled={idx === instructions.length - 1}
                            className="w-6 h-6 rounded-md bg-white border border-slate-200 hover:border-orange-300 hover:bg-orange-50 hover:text-orange-700 disabled:opacity-30 disabled:hover:bg-white disabled:hover:border-slate-200 disabled:hover:text-slate-400 text-slate-600 flex items-center justify-center transition-colors"
                            title="Descendre cette étape"
                            aria-label={`Descendre l'étape ${step.stepNumber}`}
                          >
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Step Text & Optional Timer */}
                      <div className="flex-1 space-y-2 min-w-0">
                        <textarea
                          ref={(el) => {
                            stepTextareaRefs.current[step.uid] = el;
                          }}
                          required
                          rows={2}
                          placeholder={`Description de l'étape ${step.stepNumber}...`}
                          value={step.text}
                          onChange={(e) => handleUpdateStep(idx, e.target.value, step.durationMinutes)}
                          className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-xs sm:text-sm text-slate-800 outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400"
                        />
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <input
                              type="number"
                              min="0"
                              placeholder="Minuteur optionnel (min)"
                              value={step.durationMinutes || ''}
                              onChange={(e) =>
                                handleUpdateStep(idx, step.text, e.target.value ? Number(e.target.value) : undefined)
                              }
                              className="w-44 px-2 py-1 rounded-md bg-white border border-slate-200 text-xs"
                            />
                          </div>

                          <button
                            type="button"
                            onClick={() => handleInsertStepAt(idx + 1)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-200/70 transition-colors"
                            title={`Insérer une étape supplémentaire après l'étape ${step.stepNumber}`}
                          >
                            <Plus className="w-3 h-3" />
                            <span>Insérer une étape après</span>
                          </button>
                        </div>
                      </div>

                      {/* Remove Step */}
                      <button
                        type="button"
                        onClick={() => handleRemoveStep(idx)}
                        disabled={instructions.length <= 1}
                        className="w-8 h-8 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 disabled:opacity-30 flex items-center justify-center transition-colors shrink-0"
                        title="Supprimer cette étape"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* User Comments / Notes */}
          <div className="border border-amber-200/80 rounded-2xl p-4 sm:p-5 bg-amber-50/40 space-y-2">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-amber-700" />
              <label className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                Mes remarques &amp; astuces personnelles
              </label>
            </div>
            <textarea
              rows={3}
              placeholder="Ex: Remplacer le vin blanc par du bouillon, ajouter un peu d'ail noir, bien surveiller la réduction..."
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              className="w-full p-3 rounded-xl bg-white border border-amber-300 text-xs sm:text-sm text-slate-800 outline-none focus:ring-2 focus:ring-amber-500/20"
            />
          </div>

          {/* Image & Source URLs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-1 text-[11px] font-bold text-slate-600 mb-1">
                <Image className="w-3.5 h-3.5 text-slate-500" />
                <span>URL de la photo (optionnel)</span>
              </label>
              <input
                type="url"
                placeholder="https://images.unsplash.com/..."
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-700"
              />
            </div>
            <div>
              <label className="flex items-center gap-1 text-[11px] font-bold text-slate-600 mb-1">
                <Sparkles className="w-3.5 h-3.5 text-slate-500" />
                <span>URL du site source (optionnel)</span>
              </label>
              <input
                type="url"
                placeholder="https://www.marmiton.org/..."
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-700"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3 sticky bottom-0 bg-white/95 backdrop-blur-md pb-safe">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-2xl text-xs sm:text-sm font-bold bg-orange-600 hover:bg-orange-700 text-white shadow-md shadow-orange-600/20 active:scale-95 transition-all"
            >
              {isEditing ? 'Enregistrer les modifications' : 'Créer la recette'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
