import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Users,
  ShoppingCart,
  Calendar,
  Sparkles,
  Utensils,
  Clock,
  X
} from 'lucide-react';
import { MealPlan, Recipe, DayOfWeek, MealType, MealSlotItem } from '../types/recipe';
import { formatWeekRange, getMondayOfWeek } from '../services/mealPlanService';

interface MealPlannerViewProps {
  currentPlan: MealPlan;
  recipes: Recipe[];
  onUpdatePlan: (plan: MealPlan) => void;
  onGenerateGroceryList: () => void;
  onOpenRecipeDetail: (recipe: Recipe) => void;
  weekStartDate: string;
  onChangeWeek: (newMondayDate: string) => void;
}

const DAYS: { key: DayOfWeek; label: string; short: string }[] = [
  { key: 'monday', label: 'Lundi', short: 'Lun' },
  { key: 'tuesday', label: 'Mardi', short: 'Mar' },
  { key: 'wednesday', label: 'Mercredi', short: 'Mer' },
  { key: 'thursday', label: 'Jeudi', short: 'Jeu' },
  { key: 'friday', label: 'Vendredi', short: 'Ven' },
  { key: 'saturday', label: 'Samedi', short: 'Sam' },
  { key: 'sunday', label: 'Dimanche', short: 'Dim' },
];

const MEAL_TYPES: { key: MealType; label: string; icon: string }[] = [
  { key: 'breakfast', label: 'Petit-déj', icon: '☕' },
  { key: 'lunch', label: 'Déjeuner', icon: '🥗' },
  { key: 'dinner', label: 'Dîner', icon: '🍲' },
  { key: 'snack', label: 'Collation', icon: '🍎' },
];

export const MealPlannerView: React.FC<MealPlannerViewProps> = ({
  currentPlan,
  recipes,
  onUpdatePlan,
  onGenerateGroceryList,
  onOpenRecipeDetail,
  weekStartDate,
  onChangeWeek,
}) => {
  // Picker modal state
  const [pickerSlot, setPickerSlot] = useState<{ day: DayOfWeek; mealType: MealType } | null>(null);
  const [pickerSearch, setPickerSearch] = useState('');
  const [pickerFilterCategory, setPickerFilterCategory] = useState<string>('all');

  // Navigate weeks
  const navigateWeek = (offsetDays: number) => {
    const cur = new Date(weekStartDate + 'T00:00:00');
    cur.setDate(cur.getDate() + offsetDays);
    onChangeWeek(getMondayOfWeek(cur));
  };

  const goToCurrentWeek = () => {
    onChangeWeek(getMondayOfWeek(new Date()));
  };

  // Calculate day date
  const getDayDate = (dayIndex: number): string => {
    try {
      const mon = new Date(weekStartDate + 'T00:00:00');
      mon.setDate(mon.getDate() + dayIndex);
      return mon.toLocaleDateString('fr-FR', { day: 'numeric', month: 'numeric' });
    } catch (e) {
      return '';
    }
  };

  // Add recipe to slot
  const handleAddRecipeToSlot = (recipe: Recipe) => {
    if (!pickerSlot) return;
    const slotKey = `${pickerSlot.day}_${pickerSlot.mealType}`;
    const currentSlots = currentPlan.slots || {};
    const existingItems = currentSlots[slotKey] || [];

    const newItem: MealSlotItem = {
      id: `slot_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      recipeId: recipe.id,
      recipeTitle: recipe.title,
      recipeImage: recipe.imageUrl,
      servings: recipe.servings || 4,
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
    setPickerSlot(null);
  };

  // Remove meal from slot
  const handleRemoveItem = (slotKey: string, itemId: string) => {
    const currentSlots = currentPlan.slots || {};
    const existing = currentSlots[slotKey] || [];
    const filtered = existing.filter(item => item.id !== itemId);

    const updatedPlan: MealPlan = {
      ...currentPlan,
      slots: {
        ...currentSlots,
        [slotKey]: filtered,
      },
      updatedAt: new Date().toISOString(),
    };

    onUpdatePlan(updatedPlan);
  };

  // Change servings in slot item
  const handleChangeServings = (slotKey: string, itemId: string, delta: number) => {
    const currentSlots = currentPlan.slots || {};
    const existing = currentSlots[slotKey] || [];
    const modified = existing.map(item => {
      if (item.id === itemId) {
        return { ...item, servings: Math.max(1, item.servings + delta) };
      }
      return item;
    });

    const updatedPlan: MealPlan = {
      ...currentPlan,
      slots: {
        ...currentSlots,
        [slotKey]: modified,
      },
      updatedAt: new Date().toISOString(),
    };

    onUpdatePlan(updatedPlan);
  };

  // Count scheduled meals in this plan
  const totalScheduledMeals = Object.values(currentPlan.slots || {}).reduce(
    (acc, items) => acc + items.length,
    0
  );

  // Clear plan
  const handleClearWeek = () => {
    if (confirm('Voulez-vous réinitialiser tous les repas prévus pour cette semaine ?')) {
      const updatedPlan: MealPlan = {
        ...currentPlan,
        slots: {},
        updatedAt: new Date().toISOString(),
      };
      onUpdatePlan(updatedPlan);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Top Banner & Week Switcher */}
      <div className="bg-white rounded-3xl p-4 sm:p-6 border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center font-bold">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                Planning de la semaine
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-100 text-orange-800">
                {totalScheduledMeals} repas planifiés
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 font-medium">
              {formatWeekRange(weekStartDate)}
            </p>
          </div>
        </div>

        {/* Navigation Controls & Grocery Action */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full md:w-auto justify-between md:justify-end">
          {/* Week navigation buttons */}
          <div className="flex items-center bg-slate-100 rounded-2xl p-1">
            <button
              onClick={() => navigateWeek(-7)}
              className="p-2 rounded-xl hover:bg-white text-slate-600 hover:text-slate-900 transition-colors"
              title="Semaine précédente"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={goToCurrentWeek}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-orange-600 transition-colors"
            >
              Cette semaine
            </button>
            <button
              onClick={() => navigateWeek(7)}
              className="p-2 rounded-xl hover:bg-white text-slate-600 hover:text-slate-900 transition-colors"
              title="Semaine suivante"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Action: Generate Grocery List */}
          <button
            onClick={onGenerateGroceryList}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold bg-linear-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white text-xs sm:text-sm shadow-md shadow-orange-600/20 active:scale-95 transition-all"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Générer la liste de courses</span>
          </button>

          {totalScheduledMeals > 0 && (
            <button
              onClick={handleClearWeek}
              className="p-2.5 rounded-2xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
              title="Vider la semaine"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
        {DAYS.map((day, dayIndex) => {
          const dateStr = getDayDate(dayIndex);
          const isToday = (() => {
            const now = new Date();
            const mon = new Date(weekStartDate + 'T00:00:00');
            mon.setDate(mon.getDate() + dayIndex);
            return now.toDateString() === mon.toDateString();
          })();

          return (
            <div
              key={day.key}
              className={`rounded-3xl border transition-all flex flex-col bg-white overflow-hidden ${
                isToday
                  ? 'border-orange-400 ring-2 ring-orange-500/20 shadow-md'
                  : 'border-slate-200/80 shadow-2xs hover:border-slate-300'
              }`}
            >
              {/* Day Header */}
              <div className={`p-3 text-center border-b ${isToday ? 'bg-orange-50/80 border-orange-100' : 'bg-slate-50 border-slate-100'}`}>
                <div className="flex items-center justify-center gap-1.5">
                  <span className={`text-sm font-bold ${isToday ? 'text-orange-600' : 'text-slate-800'}`}>
                    {day.label}
                  </span>
                  {isToday && (
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-600 animate-pulse" />
                  )}
                </div>
                <span className="text-[11px] font-medium text-slate-400">{dateStr}</span>
              </div>

              {/* Meal Slots (Breakfast, Lunch, Dinner, Snack) */}
              <div className="p-2.5 space-y-2.5 flex-1 flex flex-col">
                {MEAL_TYPES.map((type) => {
                  const slotKey = `${day.key}_${type.key}`;
                  const items = currentPlan.slots?.[slotKey] || [];

                  return (
                    <div
                      key={type.key}
                      className="rounded-2xl p-2 bg-slate-50/60 border border-slate-100/80 flex-1 flex flex-col justify-between"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                          <span>{type.icon}</span>
                          <span>{type.label}</span>
                        </span>
                        <button
                          onClick={() => setPickerSlot({ day: day.key, mealType: type.key })}
                          className="w-5 h-5 rounded-full bg-white hover:bg-orange-100 hover:text-orange-600 border border-slate-200 flex items-center justify-center text-slate-400 transition-colors"
                          title={`Ajouter un repas (${type.label})`}
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Scheduled Meals in this slot */}
                      <div className="space-y-1.5">
                        {items.length === 0 ? (
                          <div
                            onClick={() => setPickerSlot({ day: day.key, mealType: type.key })}
                            className="py-2 px-1 text-center border border-dashed border-slate-200 rounded-xl cursor-pointer hover:bg-orange-50/50 hover:border-orange-300 transition-all group"
                          >
                            <span className="text-[10px] text-slate-400 group-hover:text-orange-600 font-medium">
                              + Choisir
                            </span>
                          </div>
                        ) : (
                          items.map((item) => (
                            <div
                              key={item.id}
                              className="p-2 rounded-xl bg-white border border-slate-200/90 shadow-2xs group relative"
                            >
                              <div className="flex items-start justify-between gap-1">
                                <p
                                  onClick={() => {
                                    const rec = recipes.find(r => r.id === item.recipeId);
                                    if (rec) onOpenRecipeDetail(rec);
                                  }}
                                  className="text-xs font-bold text-slate-800 line-clamp-2 hover:text-orange-600 cursor-pointer"
                                >
                                  {item.recipeTitle}
                                </p>
                                <button
                                  onClick={() => handleRemoveItem(slotKey, item.id)}
                                  className="text-slate-300 hover:text-rose-500 p-0.5"
                                  title="Retirer ce repas"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>

                              {/* Servings control */}
                              <div className="flex items-center justify-between mt-1.5 pt-1 border-t border-slate-100 text-[10px] text-slate-500 font-medium">
                                <span className="flex items-center gap-1">
                                  <Users className="w-3 h-3 text-orange-500" />
                                  <span>{item.servings} pers.</span>
                                </span>

                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => handleChangeServings(slotKey, item.id, -1)}
                                    className="w-4 h-4 rounded bg-slate-100 hover:bg-slate-200 flex items-center justify-center font-bold"
                                  >
                                    -
                                  </button>
                                  <button
                                    onClick={() => handleChangeServings(slotKey, item.id, 1)}
                                    className="w-4 h-4 rounded bg-slate-100 hover:bg-slate-200 flex items-center justify-center font-bold"
                                  >
                                    +
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Recipe Picker Modal */}
      {pickerSlot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className="bg-white rounded-3xl max-w-xl w-full max-h-[85vh] overflow-y-auto shadow-2xl border border-slate-100 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-md z-10">
              <div>
                <h3 className="font-bold text-slate-800 text-base">
                  Choisir une recette
                </h3>
                <p className="text-xs text-slate-500">
                  Pour le {DAYS.find(d => d.key === pickerSlot.day)?.label} ({MEAL_TYPES.find(t => t.key === pickerSlot.mealType)?.label})
                </p>
              </div>
              <button
                onClick={() => setPickerSlot(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search & Category Filter */}
            <div className="p-4 border-b border-slate-100 space-y-3 bg-slate-50">
              <input
                type="text"
                placeholder="Rechercher une recette (ex: risotto, quinoa)..."
                value={pickerSearch}
                onChange={(e) => setPickerSearch(e.target.value)}
                className="w-full px-4 py-2 rounded-xl bg-white border border-slate-200 text-xs sm:text-sm outline-none focus:ring-2 focus:ring-orange-500/20"
              />

              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {['all', 'végétarien', 'rapide', 'plat principal', 'dessert'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setPickerFilterCategory(cat)}
                    className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                      pickerFilterCategory === cat
                        ? 'bg-orange-600 text-white'
                        : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
                    }`}
                  >
                    {cat === 'all' ? 'Toutes' : cat}
                  </button>
                ))}
              </div>
            </div>

            {/* List of recipes */}
            <div className="p-4 space-y-2 flex-1">
              {recipes
                .filter(r => {
                  const matchesSearch = !pickerSearch || r.title.toLowerCase().includes(pickerSearch.toLowerCase());
                  const matchesCat = pickerFilterCategory === 'all' || r.categories?.includes(pickerFilterCategory);
                  return matchesSearch && matchesCat;
                })
                .map((r) => {
                  const totalTime = (r.prepTimeMinutes || 0) + (r.cookTimeMinutes || 0);
                  const isVeg = r.categories?.includes('végétarien');
                  const isQuick = r.categories?.includes('rapide');

                  return (
                    <div
                      key={r.id}
                      onClick={() => handleAddRecipeToSlot(r)}
                      className="flex items-center justify-between gap-3 p-3 rounded-2xl border border-slate-100 hover:border-orange-300 hover:bg-orange-50/40 cursor-pointer transition-all group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {r.imageUrl ? (
                          <img
                            src={r.imageUrl}
                            alt={r.title}
                            className="w-12 h-12 rounded-xl object-cover shrink-0"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
                            <Utensils className="w-5 h-5" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-bold text-xs sm:text-sm text-slate-800 group-hover:text-orange-600 transition-colors truncate">
                            {r.title}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400">
                            <span className="flex items-center gap-0.5">
                              <Clock className="w-3 h-3 text-orange-500" />
                              <span>{totalTime} min</span>
                            </span>
                            {isVeg && <span className="text-emerald-600 font-semibold">• 🌱 Végé</span>}
                            {isQuick && <span className="text-amber-600 font-semibold">• ⚡ Rapide</span>}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        className="px-3 py-1.5 rounded-xl bg-orange-50 group-hover:bg-orange-600 group-hover:text-white text-orange-700 font-bold text-xs transition-colors shrink-0"
                      >
                        Choisir
                      </button>
                    </div>
                  );
                })}

              {recipes.length === 0 && (
                <p className="text-center py-8 text-xs text-slate-400">
                  Aucune recette disponible. Importez ou créez-en une d'abord !
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
