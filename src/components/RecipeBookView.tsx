import React, { useState, useMemo } from 'react';
import { Search, Sparkles, Plus, Heart, SlidersHorizontal, UtensilsCrossed, Clock, Zap } from 'lucide-react';
import { Recipe, PRESET_CATEGORIES } from '../types/recipe';
import { RecipeCard } from './RecipeCard';

interface RecipeBookViewProps {
  recipes: Recipe[];
  onSelectRecipe: (recipe: Recipe) => void;
  onToggleFavorite: (recipe: Recipe, e: React.MouseEvent) => void;
  onQuickAddToPlan: (recipe: Recipe, e: React.MouseEvent) => void;
  onDeleteRecipe?: (recipeId: string) => void;
  onOpenImporter: () => void;
  onOpenNewRecipe: () => void;
}

export const RecipeBookView: React.FC<RecipeBookViewProps> = ({
  recipes,
  onSelectRecipe,
  onToggleFavorite,
  onQuickAddToPlan,
  onDeleteRecipe,
  onOpenImporter,
  onOpenNewRecipe,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [sortBy, setSortBy] = useState<'recent' | 'quick' | 'name' | 'rating'>('recent');

  // Compute category counts
  const vegetarianCount = recipes.filter(r =>
    r.categories?.some(c => c.toLowerCase().includes('végétar'))
  ).length;

  const quickCount = recipes.filter(r =>
    r.categories?.some(c => c.toLowerCase().includes('rapide')) ||
    ((r.prepTimeMinutes || 0) + (r.cookTimeMinutes || 0) <= 30)
  ).length;

  const favoritesCount = recipes.filter(r => r.favorite).length;

  // Filtered and sorted recipes
  const filteredRecipes = useMemo(() => {
    return recipes
      .filter(recipe => {
        // Search filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchesTitle = recipe.title.toLowerCase().includes(q);
          const matchesDesc = recipe.description?.toLowerCase().includes(q);
          const matchesComments = recipe.comments?.toLowerCase().includes(q);
          const matchesIngredient = recipe.ingredients?.some(i => i.name.toLowerCase().includes(q));
          const matchesCat = recipe.categories?.some(c => c.toLowerCase().includes(q));

          if (!matchesTitle && !matchesDesc && !matchesComments && !matchesIngredient && !matchesCat) {
            return false;
          }
        }

        // Favorites filter
        if (onlyFavorites && !recipe.favorite) {
          return false;
        }

        // Category filter
        if (selectedCategory !== 'all') {
          if (selectedCategory === 'végétarien') {
            return recipe.categories?.some(c => c.toLowerCase().includes('végétar'));
          }
          if (selectedCategory === 'rapide') {
            const total = (recipe.prepTimeMinutes || 0) + (recipe.cookTimeMinutes || 0);
            return recipe.categories?.some(c => c.toLowerCase().includes('rapide')) || total <= 30;
          }
          return recipe.categories?.some(c => c.toLowerCase() === selectedCategory.toLowerCase());
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'name') {
          return a.title.localeCompare(b.title, 'fr');
        }
        if (sortBy === 'rating') {
          return (b.rating || 0) - (a.rating || 0);
        }
        if (sortBy === 'quick') {
          const timeA = (a.prepTimeMinutes || 0) + (a.cookTimeMinutes || 0);
          const timeB = (b.prepTimeMinutes || 0) + (b.cookTimeMinutes || 0);
          return timeA - timeB;
        }
        // default: recent
        return new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime();
      });
  }, [recipes, searchQuery, selectedCategory, onlyFavorites, sortBy]);

  return (
    <div className="space-y-6 pb-20">
      {/* Top Hero / Search Banner */}
      <div className="bg-white rounded-3xl p-4 sm:p-6 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Mon Carnet de Recettes
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              {recipes.length} recettes enregistrées • {vegetarianCount} végétariennes • {quickCount} rapides (&le; 30 min)
            </p>
          </div>

          {/* Quick Action buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenImporter}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-orange-50 hover:bg-orange-100 text-orange-700 font-semibold text-xs sm:text-sm border border-orange-200/80 transition-all shadow-2xs"
            >
              <Sparkles className="w-4 h-4 text-orange-600" />
              <span>Importer du Web</span>
            </button>
            <button
              onClick={onOpenNewRecipe}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-orange-600/20 active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Créer recette</span>
            </button>
          </div>
        </div>

        {/* Search Input & Sort */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher par titre, ingrédient (ex: champignons, saumon), astuce..."
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-50 hover:bg-slate-100/70 border border-slate-200 text-xs sm:text-sm outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                &times;
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 outline-none pr-8 cursor-pointer"
              >
                <option value="recent">Plus récentes</option>
                <option value="quick">Plus rapides d'abord</option>
                <option value="rating">Mieux notées</option>
                <option value="name">Alphabétique (A-Z)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Category Pills Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 no-scrollbar">
          <button
            onClick={() => { setSelectedCategory('all'); setOnlyFavorites(false); }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              selectedCategory === 'all' && !onlyFavorites
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
            }`}
          >
            Toutes ({recipes.length})
          </button>

          <button
            onClick={() => {
              setOnlyFavorites(!onlyFavorites);
              if (!onlyFavorites) setSelectedCategory('all');
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1 ${
              onlyFavorites
                ? 'bg-rose-500 text-white shadow-xs'
                : 'bg-rose-50 hover:bg-rose-100 text-rose-700'
            }`}
          >
            <Heart className={`w-3.5 h-3.5 ${onlyFavorites ? 'fill-current' : ''}`} />
            <span>Favoris ({favoritesCount})</span>
          </button>

          <button
            onClick={() => { setSelectedCategory('végétarien'); setOnlyFavorites(false); }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1 ${
              selectedCategory === 'végétarien' && !onlyFavorites
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800'
            }`}
          >
            <span>🌱</span>
            <span>Végétarien ({vegetarianCount})</span>
          </button>

          <button
            onClick={() => { setSelectedCategory('rapide'); setOnlyFavorites(false); }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1 ${
              selectedCategory === 'rapide' && !onlyFavorites
                ? 'bg-amber-500 text-white shadow-xs'
                : 'bg-amber-50 hover:bg-amber-100 text-amber-800'
            }`}
          >
            <span>⚡</span>
            <span>Rapide ≤ 30 min ({quickCount})</span>
          </button>

          {['plat principal', 'entrée', 'dessert', 'santé', 'sans gluten', 'italien', 'asiatique'].map((cat) => (
            <button
              key={cat}
              onClick={() => { setSelectedCategory(cat); setOnlyFavorites(false); }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap capitalize ${
                selectedCategory === cat && !onlyFavorites
                  ? 'bg-orange-600 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Recipe Cards */}
      {filteredRecipes.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredRecipes.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              onSelect={onSelectRecipe}
              onToggleFavorite={onToggleFavorite}
              onQuickAddToPlan={onQuickAddToPlan}
              onDeleteRecipe={onDeleteRecipe}
            />
          ))}
        </div>
      ) : (
        /* Empty search or collection state */
        <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200/80 text-center space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-orange-100 text-orange-600 flex items-center justify-center text-3xl mx-auto shadow-inner">
            🍲
          </div>
          <div>
            <h3 className="font-extrabold text-lg text-slate-800">
              Aucune recette trouvée
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto mt-1 leading-relaxed">
              {searchQuery || selectedCategory !== 'all' || onlyFavorites
                ? 'Aucune recette ne correspond à vos filtres actuels. Réinitialisez la recherche ou changez de catégorie.'
                : 'Votre carnet est vide pour le moment. Importez une recette depuis un site web ou créez la vôtre !'}
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-3 pt-2">
            {(searchQuery || selectedCategory !== 'all' || onlyFavorites) && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                  setOnlyFavorites(false);
                }}
                className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs sm:text-sm transition-colors"
              >
                Réinitialiser les filtres
              </button>
            )}
            <button
              onClick={onOpenImporter}
              className="px-5 py-2.5 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-orange-600/20 transition-all"
            >
              Importer du web
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
