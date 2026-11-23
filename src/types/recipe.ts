export type GroceryCategory =
  | 'Fruits & Légumes'
  | 'Produits laitiers & Œufs'
  | 'Boucherie & Poissonnerie'
  | 'Épicerie & Féculents'
  | 'Condiments, Huiles & Épices'
  | 'Boulangerie & Pâtisserie'
  | 'Surgelés & Autre';

export const GROCERY_CATEGORIES: { name: GroceryCategory; icon: string; color: string }[] = [
  { name: 'Fruits & Légumes', icon: '🥕', color: 'emerald' },
  { name: 'Produits laitiers & Œufs', icon: '🥛', color: 'blue' },
  { name: 'Boucherie & Poissonnerie', icon: '🥩', color: 'rose' },
  { name: 'Épicerie & Féculents', icon: '🌾', color: 'amber' },
  { name: 'Condiments, Huiles & Épices', icon: '🧂', color: 'orange' },
  { name: 'Boulangerie & Pâtisserie', icon: '🥖', color: 'yellow' },
  { name: 'Surgelés & Autre', icon: '❄️', color: 'slate' },
];

export interface Ingredient {
  id: string;
  name: string;
  amount: number | string;
  unit: string;
  category: GroceryCategory;
}

export interface InstructionStep {
  stepNumber: number;
  text: string;
  durationMinutes?: number;
}

export interface Recipe {
  id: string;
  userId: string;
  title: string;
  description?: string;
  prepTimeMinutes: number;
  cookTimeMinutes: number;
  servings: number;
  categories: string[];
  ingredients: Ingredient[];
  instructions: InstructionStep[];
  comments?: string;
  rating?: number;
  sourceUrl?: string;
  imageUrl?: string;
  favorite?: boolean;
  createdAt: string;
  updatedAt: string;
}

export type DayOfWeek =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface MealSlotItem {
  id: string;
  recipeId: string;
  recipeTitle: string;
  recipeImage?: string;
  servings: number;
  notes?: string;
}

export interface MealPlan {
  id: string;
  userId: string;
  weekStartDate: string; // ISO date of the Monday (YYYY-MM-DD)
  // Map keyed by `${day}_${mealType}` e.g. "monday_dinner" -> MealSlotItem[]
  slots: Record<string, MealSlotItem[]>;
  updatedAt: string;
}

export interface GroceryItem {
  id: string;
  name: string;
  amount: number | string;
  unit: string;
  category: GroceryCategory;
  checked: boolean;
  recipeSourceTitle?: string;
  isCustom?: boolean;
}

export interface GroceryList {
  id: string;
  userId: string;
  weekStartDate?: string;
  items: GroceryItem[];
  pantryStaples?: string[];
  updatedAt: string;
}

export const PRESET_CATEGORIES = [
  'végétarien',
  'rapide',
  'plat principal',
  'entrée',
  'dessert',
  'santé',
  'sans gluten',
  'pâtes',
  'soupe & salade',
  'italien',
  'asiatique',
  'enfants',
  'économique',
  'mijoteuse'
];

export const DEFAULT_PANTRY_STAPLES: string[] = [
  'sel',
  'poivre',
  'sel et poivre',
  'eau',
  'huile d\'olive',
  'huile végétale',
  'huile de tournesol',
  'sucre',
  'farine',
  'beurre',
  'vinaigre',
  'ail'
];

