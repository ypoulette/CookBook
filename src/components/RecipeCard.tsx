import React, { useState } from 'react';
import { Clock, Users, Heart, CalendarPlus, MessageSquare, Star, Trash2 } from 'lucide-react';
import { Recipe } from '../types/recipe';

interface RecipeCardProps {
  recipe: Recipe;
  onSelect: (recipe: Recipe) => void;
  onToggleFavorite: (recipe: Recipe, e: React.MouseEvent) => void;
  onQuickAddToPlan: (recipe: Recipe, e: React.MouseEvent) => void;
  onDeleteRecipe?: (recipeId: string) => void;
}

export const RecipeCard: React.FC<RecipeCardProps> = ({
  recipe,
  onSelect,
  onToggleFavorite,
  onQuickAddToPlan,
  onDeleteRecipe,
}) => {
  const [showCardDeleteConfirm, setShowCardDeleteConfirm] = useState(false);
  const totalTime = (recipe.prepTimeMinutes || 0) + (recipe.cookTimeMinutes || 0);
  const isVegetarian = recipe.categories?.some(c => c.toLowerCase().includes('végétar') || c.toLowerCase().includes('vegan'));
  const isQuick = recipe.categories?.some(c => c.toLowerCase().includes('rapide')) || totalTime <= 30;

  return (
    <div
      onClick={() => onSelect(recipe)}
      className="group bg-white rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-xl hover:border-orange-200 transition-all duration-300 overflow-hidden cursor-pointer flex flex-col h-full transform hover:-translate-y-1"
    >
      {/* Image & Badges */}
      <div className="relative aspect-16/10 w-full overflow-hidden bg-slate-100">
        {recipe.imageUrl ? (
          <img
            src={recipe.imageUrl}
            alt={recipe.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-linear-to-br from-amber-100 to-orange-100 text-orange-600">
            <span className="text-4xl mb-1">🍲</span>
            <span className="text-xs font-semibold uppercase tracking-wider text-orange-700/70">Fait maison</span>
          </div>
        )}

        <div className="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-black/20 pointer-events-none" />

        {/* Favorite Button */}
        <button
          onClick={(e) => onToggleFavorite(recipe, e)}
          className={`
            absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-md transition-all
            ${
              recipe.favorite
                ? 'bg-rose-500 text-white shadow-md shadow-rose-500/30'
                : 'bg-white/80 text-slate-600 hover:bg-white hover:text-rose-500'
            }
          `}
          title={recipe.favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
        >
          <Heart className={`w-4 h-4 ${recipe.favorite ? 'fill-current' : ''}`} />
        </button>

        {/* Categories Overlays (végétarien, rapide, etc.) */}
        <div className="absolute bottom-3 left-3 right-3 flex flex-wrap gap-1.5 items-center">
          {isVegetarian && (
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500 text-white shadow-sm flex items-center gap-1">
              🌱 Végétarien
            </span>
          )}
          {isQuick && (
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500 text-white shadow-sm flex items-center gap-1">
              ⚡ Rapide
            </span>
          )}
          {recipe.categories
            ?.filter(c => !c.toLowerCase().includes('végétar') && !c.toLowerCase().includes('rapide'))
            .slice(0, 2)
            .map((cat) => (
              <span
                key={cat}
                className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-black/50 text-white backdrop-blur-xs capitalize"
              >
                {cat}
              </span>
            ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <h3 className="font-bold text-slate-800 text-base sm:text-lg line-clamp-1 group-hover:text-orange-600 transition-colors">
              {recipe.title}
            </h3>
            {recipe.rating && (
              <div className="flex items-center gap-1 text-xs font-bold text-amber-500 shrink-0">
                <Star className="w-3.5 h-3.5 fill-current" />
                <span>{recipe.rating}</span>
              </div>
            )}
          </div>

          {recipe.description && (
            <p className="text-xs text-slate-500 line-clamp-2 mb-3 leading-relaxed">
              {recipe.description}
            </p>
          )}
        </div>

        <div>
          {/* Metadata info */}
          <div className="flex items-center gap-4 text-xs font-medium text-slate-600 py-2 border-t border-slate-100">
            <div className="flex items-center gap-1 text-slate-500">
              <Clock className="w-3.5 h-3.5 text-orange-500" />
              <span>{totalTime > 0 ? `${totalTime} min` : '15 min'}</span>
            </div>
            <div className="flex items-center gap-1 text-slate-500">
              <Users className="w-3.5 h-3.5 text-orange-500" />
              <span>{recipe.servings || 4} pers.</span>
            </div>
            {recipe.comments && (
              <div className="flex items-center gap-1 text-orange-600 ml-auto" title="Note personnelle attachée">
                <MessageSquare className="w-3.5 h-3.5" />
                <span className="text-[11px] font-semibold hidden sm:inline">Notes</span>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold text-orange-600 group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
              Voir la recette &rarr;
            </span>

            <div className="flex items-center gap-1.5">
              {onDeleteRecipe && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowCardDeleteConfirm(true);
                  }}
                  className="p-1.5 rounded-xl text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                  title="Supprimer la recette"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={(e) => onQuickAddToPlan(recipe, e)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium bg-orange-50 hover:bg-orange-100 text-orange-700 transition-colors"
                title="Ajouter au planning de la semaine"
              >
                <CalendarPlus className="w-3.5 h-3.5" />
                <span>Planifier</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal for Card */}
      {showCardDeleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150 cursor-default"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 sm:p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="text-base sm:text-lg font-bold text-slate-900">
                Supprimer la recette ?
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed">
                Êtes-vous certain de vouloir supprimer <strong>« {recipe.title} »</strong> ?
              </p>
            </div>
            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowCardDeleteConfirm(false);
                }}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs sm:text-sm transition-colors"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowCardDeleteConfirm(false);
                  onDeleteRecipe?.(recipe.id);
                }}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-rose-600/20 active:scale-95 transition-all"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
