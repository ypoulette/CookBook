import React, { useState } from 'react';
import { X, CalendarPlus, Users, Check } from 'lucide-react';
import { Recipe, DayOfWeek, MealType, MealPlan, MealSlotItem } from '../types/recipe';

interface QuickAddToPlanModalProps {
  recipe: Recipe | null;
  defaultServings?: number;
  isOpen: boolean;
  onClose: () => void;
  currentPlan: MealPlan;
  onUpdatePlan: (plan: MealPlan) => void;
  weekRangeText: string;
}

const DAYS: { key: DayOfWeek; label: string }[] = [
  { key: 'monday', label: 'Lundi' },
  { key: 'tuesday', label: 'Mardi' },
  { key: 'wednesday', label: 'Mercredi' },
  { key: 'thursday', label: 'Jeudi' },
  { key: 'friday', label: 'Vendredi' },
  { key: 'saturday', label: 'Samedi' },
  { key: 'sunday', label: 'Dimanche' },
];

const MEAL_TYPES: { key: MealType; label: string; icon: string }[] = [
  { key: 'breakfast', label: 'Petit-déjeuner', icon: '☕' },
  { key: 'lunch', label: 'Déjeuner', icon: '🥗' },
  { key: 'dinner', label: 'Dîner', icon: '🍲' },
  { key: 'snack', label: 'Collation', icon: '🍎' },
];

export const QuickAddToPlanModal: React.FC<QuickAddToPlanModalProps> = ({
  recipe,
  defaultServings,
  isOpen,
  onClose,
  currentPlan,
  onUpdatePlan,
  weekRangeText,
}) => {
  if (!isOpen || !recipe) return null;

  const [selectedDay, setSelectedDay] = useState<DayOfWeek>('monday');
  const [selectedMealType, setSelectedMealType] = useState<MealType>('dinner');
  const [servings, setServings] = useState(defaultServings || recipe.servings || 4);

  const handleConfirm = () => {
    const slotKey = `${selectedDay}_${selectedMealType}`;
    const currentSlots = currentPlan.slots || {};
    const existingItems = currentSlots[slotKey] || [];

    const newItem: MealSlotItem = {
      id: `slot_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      recipeId: recipe.id,
      recipeTitle: recipe.title,
      recipeImage: recipe.imageUrl,
      servings: Number(servings) || 4,
    };

    const updatedPlan: MealPlan = {
      ...currentPlan,
      slots: {
        ...currentSlots,
        [slotKey]: [...existingItems, newItem],
      },
      updatedAt: new Date().toISOString(),
    };

    onUpdatePlan(updatedPlan);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-100 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center font-bold">
              <CalendarPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base">Planifier ce repas</h3>
              <p className="text-xs text-slate-500">Semaine : {weekRangeText}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Recette sélectionnée</p>
          <p className="font-bold text-sm text-slate-900 line-clamp-1">{recipe.title}</p>
        </div>

        {/* Day Selection */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            Jour de la semaine
          </label>
          <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
            {DAYS.map(day => (
              <button
                key={day.key}
                type="button"
                onClick={() => setSelectedDay(day.key)}
                className={`py-2 px-1 rounded-xl text-xs font-bold transition-all ${
                  selectedDay === day.key
                    ? 'bg-orange-600 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                {day.label.slice(0, 3)}
              </button>
            ))}
          </div>
        </div>

        {/* Meal Type Selection */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            Moment du repas
          </label>
          <div className="grid grid-cols-2 gap-2">
            {MEAL_TYPES.map(type => (
              <button
                key={type.key}
                type="button"
                onClick={() => setSelectedMealType(type.key)}
                className={`p-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all border ${
                  selectedMealType === type.key
                    ? 'bg-orange-50 border-orange-500 text-orange-800'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span className="text-base">{type.icon}</span>
                <span>{type.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Servings for this meal */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            Nombre de portions prévues
          </label>
          <div className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-2xl border border-slate-100">
            <Users className="w-5 h-5 text-orange-600 ml-1" />
            <span className="text-xs text-slate-600 font-medium">Portions :</span>
            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={() => setServings(prev => Math.max(1, prev - 1))}
                className="w-7 h-7 rounded-xl bg-white border border-slate-200 font-bold hover:bg-slate-100 flex items-center justify-center text-slate-700"
              >
                -
              </button>
              <span className="w-6 text-center font-bold text-sm text-slate-800">{servings}</span>
              <button
                type="button"
                onClick={() => setServings(prev => prev + 1)}
                className="w-7 h-7 rounded-xl bg-white border border-slate-200 font-bold hover:bg-slate-100 flex items-center justify-center text-slate-700"
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-2">
          <button
            onClick={handleConfirm}
            className="w-full py-3.5 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-2xl text-sm shadow-md shadow-orange-600/20 flex items-center justify-center gap-2 active:scale-95 transition-all"
          >
            <Check className="w-4 h-4" />
            <span>Ajouter au planning</span>
          </button>
        </div>
      </div>
    </div>
  );
};
