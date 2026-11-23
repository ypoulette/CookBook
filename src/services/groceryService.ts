import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, stripUndefinedDeep } from './firebase';
import { GroceryItem, GroceryList, MealPlan, Recipe, GroceryCategory, DEFAULT_PANTRY_STAPLES } from '../types/recipe';

const LOCAL_STORAGE_GROCERY_PREFIX = 'cuisinesync_grocery_';
const LOCAL_STORAGE_PANTRY_KEY = 'cuisinesync_pantry_staples';

export function getLocalPantryStaples(): string[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_PANTRY_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch {
    // ignore
  }
  return [...DEFAULT_PANTRY_STAPLES];
}

export function saveLocalPantryStaples(staples: string[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_PANTRY_KEY, JSON.stringify(staples));
  } catch (e) {
    console.error('Failed to save pantry staples locally', e);
  }
}

export function isPantryStaple(ingredientName: string, staples: string[]): boolean {
  if (!ingredientName || !staples || staples.length === 0) return false;

  const cleanName = ingredientName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

  return staples.some(staple => {
    const cleanStaple = staple
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();

    if (!cleanStaple) return false;

    if (cleanName === cleanStaple) return true;

    if (cleanStaple.includes(' ') || cleanStaple.includes("'")) {
      if (cleanName.includes(cleanStaple)) return true;
    }

    const escaped = cleanStaple.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(^|\\b|\\s)${escaped}(\\b|\\s|$)`, 'i');
    return regex.test(cleanName);
  });
}

export function getLocalGroceryList(weekStartDate: string): GroceryList {
  try {
    const key = LOCAL_STORAGE_GROCERY_PREFIX + weekStartDate;
    const raw = localStorage.getItem(key);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    // ignore
  }

  return {
    id: `local_grocery_${weekStartDate.replace(/-/g, '_')}`,
    userId: 'default',
    weekStartDate,
    items: [],
    pantryStaples: getLocalPantryStaples(),
    updatedAt: new Date().toISOString(),
  };
}

export function saveLocalGroceryList(list: GroceryList) {
  try {
    localStorage.setItem(LOCAL_STORAGE_GROCERY_PREFIX + (list.weekStartDate || 'default'), JSON.stringify(list));
  } catch (e) {
    console.error('Failed to save grocery list locally', e);
  }
}

export function getGroceryListDocId(userId: string, weekStartDate: string): string {
  const safeWeek = (weekStartDate || 'current').replace(/[^a-zA-Z0-9_\-]/g, '_');
  const safeUser = userId.replace(/[^a-zA-Z0-9_\-]/g, '_');
  return `list_${safeUser}_${safeWeek}`.slice(0, 100);
}

export async function fetchGroceryListFromFirestore(userId: string, weekStartDate: string): Promise<GroceryList | null> {
  const listId = getGroceryListDocId(userId, weekStartDate);
  const path = `grocery_lists/${listId}`;
  try {
    const docRef = doc(db, 'grocery_lists', listId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as GroceryList;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export function subscribeToGroceryList(
  userId: string,
  weekStartDate: string,
  onUpdate: (list: GroceryList | null) => void,
  onError: (err: unknown) => void
) {
  const listId = getGroceryListDocId(userId, weekStartDate);
  const path = `grocery_lists/${listId}`;
  const docRef = doc(db, 'grocery_lists', listId);

  return onSnapshot(
    docRef,
    (snap) => {
      if (snap.exists()) {
        onUpdate(snap.data() as GroceryList);
      } else {
        onUpdate(null);
      }
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.GET, path);
      } catch (err) {
        onError(err);
      }
    }
  );
}

export async function saveGroceryListToFirestore(list: GroceryList): Promise<void> {
  const listId = getGroceryListDocId(list.userId, list.weekStartDate || 'current');
  const path = `grocery_lists/${listId}`;
  try {
    const docRef = doc(db, 'grocery_lists', listId);
    const sanitized = stripUndefinedDeep({
      id: listId,
      userId: list.userId,
      weekStartDate: String(list.weekStartDate || 'current').slice(0, 30),
      items: (Array.isArray(list.items) ? list.items : []).slice(0, 300),
      ...(Array.isArray(list.pantryStaples)
        ? { pantryStaples: list.pantryStaples.slice(0, 150) }
        : {}),
      updatedAt: new Date().toISOString().slice(0, 50),
    });
    await setDoc(docRef, sanitized);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export interface GroceryGenerationResult {
  items: GroceryItem[];
  excludedPantryItems: string[];
}

// Generate consolidated grocery list from meal plan, excluding pantry staples
export function generateGroceryListFromPlan(
  plan: MealPlan,
  recipes: Recipe[],
  existingItems: GroceryItem[] = [],
  pantryStaples: string[] = getLocalPantryStaples(),
  options: { resetCustomItems?: boolean } = {}
): GroceryGenerationResult {
  const recipeMap = new Map<string, Recipe>();
  recipes.forEach(r => recipeMap.set(r.id, r));

  const aggregatedMap = new Map<string, {
    name: string;
    amount: number;
    unit: string;
    category: GroceryCategory;
    recipes: Set<string>;
  }>();

  const checkedMap = new Map<string, boolean>();
  const customItems: GroceryItem[] = [];

  if (!options.resetCustomItems) {
    existingItems.forEach(item => {
      if (item.isCustom) {
        customItems.push(item);
      } else {
        checkedMap.set(`${item.name.toLowerCase().trim()}_${item.unit.toLowerCase().trim()}`, item.checked);
      }
    });
  }

  const excludedSet = new Set<string>();

  Object.values(plan.slots).forEach(slotItems => {
    slotItems.forEach(slotItem => {
      const recipe = recipeMap.get(slotItem.recipeId);
      if (!recipe) return;

      const scale = (slotItem.servings || recipe.servings || 1) / (recipe.servings || 1);

      recipe.ingredients.forEach(ing => {
        const normName = ing.name.trim();

        if (isPantryStaple(normName, pantryStaples)) {
          excludedSet.add(normName);
          return;
        }

        const normUnit = (ing.unit || '').trim();
        const key = `${normName.toLowerCase()}_${normUnit.toLowerCase()}`;

        const numericAmount = typeof ing.amount === 'number' ? ing.amount : parseFloat(String(ing.amount)) || 0;
        const scaledAmount = numericAmount > 0 ? numericAmount * scale : 1;

        if (aggregatedMap.has(key)) {
          const existing = aggregatedMap.get(key)!;
          existing.amount += scaledAmount;
          existing.recipes.add(recipe.title);
        } else {
          aggregatedMap.set(key, {
            name: normName,
            amount: scaledAmount,
            unit: normUnit,
            category: ing.category || 'Épicerie & Féculents',
            recipes: new Set([recipe.title]),
          });
        }
      });
    });
  });

  const generatedItems: GroceryItem[] = [];
  let index = 0;

  aggregatedMap.forEach((val, key) => {
    const isChecked = checkedMap.get(key) || false;
    const roundedAmount = Math.round(val.amount * 10) / 10;

    generatedItems.push({
      id: `gen_${index++}_${key.slice(0, 15)}`,
      name: val.name,
      amount: roundedAmount,
      unit: val.unit,
      category: val.category,
      checked: isChecked,
      recipeSourceTitle: Array.from(val.recipes).join(', '),
      isCustom: false,
    });
  });

  return {
    items: [...generatedItems, ...customItems],
    excludedPantryItems: Array.from(excludedSet),
  };
}
