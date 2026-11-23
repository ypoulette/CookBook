import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, stripUndefinedDeep } from './firebase';
import { Recipe } from '../types/recipe';
import { INITIAL_RECIPES } from '../data/initialRecipes';

const LOCAL_STORAGE_RECIPES_KEY = 'cuisinesync_local_recipes';
const PENDING_SYNC_IDS_KEY = 'cuisinesync_pending_recipe_ids';

export function getLocalRecipes(): Recipe[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_RECIPES_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_STORAGE_RECIPES_KEY, JSON.stringify(INITIAL_RECIPES));
      return INITIAL_RECIPES;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_RECIPES;
  }
}

export function saveLocalRecipes(recipes: Recipe[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_RECIPES_KEY, JSON.stringify(recipes));
  } catch (e) {
    console.error('Failed to save to local storage', e);
  }
}

export function getPendingSyncRecipeIds(): string[] {
  try {
    const raw = localStorage.getItem(PENDING_SYNC_IDS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function markRecipePendingSync(recipeId: string) {
  try {
    const current = new Set(getPendingSyncRecipeIds());
    current.add(recipeId);
    localStorage.setItem(PENDING_SYNC_IDS_KEY, JSON.stringify(Array.from(current)));
  } catch {
    // ignore
  }
}

export function clearRecipePendingSync(recipeId: string) {
  try {
    const current = new Set(getPendingSyncRecipeIds());
    current.delete(recipeId);
    localStorage.setItem(PENDING_SYNC_IDS_KEY, JSON.stringify(Array.from(current)));
  } catch {
    // ignore
  }
}

/**
 * Ensures every outgoing Recipe strictly conforms to firebase-blueprint.json & firestore.rules:
 * - valid document ID (`^[a-zA-Z0-9_-]+$`, max 128)
 * - strict string & array bounds
 * - ZERO `undefined` values (top-level or nested inside ingredients/instructions)
 * - only allowed schema keys
 */
export function sanitizeRecipeForFirestore(recipe: Recipe, userId: string): Recipe {
  const safeId = (recipe.id || `rec_${Date.now()}`)
    .replace(/[^a-zA-Z0-9_\-]/g, '_')
    .slice(0, 120);

  const safeTitle = (recipe.title || 'Recette sans titre').trim().slice(0, 200) || 'Recette sans titre';
  const safeDescription = typeof recipe.description === 'string' ? recipe.description.trim().slice(0, 1000) : '';
  const safeComments = typeof recipe.comments === 'string' && recipe.comments.trim()
    ? recipe.comments.trim().slice(0, 2000)
    : undefined;
  const safeSourceUrl = typeof recipe.sourceUrl === 'string' && recipe.sourceUrl.trim()
    ? recipe.sourceUrl.trim().slice(0, 500)
    : undefined;
  const safeImageUrl = typeof recipe.imageUrl === 'string' && recipe.imageUrl.trim()
    ? recipe.imageUrl.trim().slice(0, 1000)
    : undefined;

  const safeCategories = Array.isArray(recipe.categories)
    ? recipe.categories
        .filter((c): c is string => typeof c === 'string' && c.trim().length > 0)
        .map((c) => c.trim().slice(0, 50))
        .slice(0, 30)
    : ['plat principal'];

  const safeIngredients = (Array.isArray(recipe.ingredients) ? recipe.ingredients : [])
    .slice(0, 100)
    .map((ing, idx) =>
      stripUndefinedDeep({
        id: String(ing.id || `ing_${idx}`),
        name: String(ing.name || '').trim().slice(0, 200),
        amount: ing.amount !== undefined && ing.amount !== null ? ing.amount : '',
        unit: String(ing.unit || '').trim().slice(0, 50),
        category: ing.category || 'Épicerie & Féculents',
      })
    );

  const safeInstructions = (Array.isArray(recipe.instructions) ? recipe.instructions : [])
    .slice(0, 100)
    .map((step, idx) => {
      const cleanedStep: { stepNumber: number; text: string; durationMinutes?: number } = {
        stepNumber: idx + 1,
        text: String(step.text || '').trim().slice(0, 2000),
      };
      if (typeof step.durationMinutes === 'number' && !Number.isNaN(step.durationMinutes) && step.durationMinutes > 0) {
        cleanedStep.durationMinutes = step.durationMinutes;
      }
      return cleanedStep;
    });

  const payload: Recipe = {
    id: safeId,
    userId,
    title: safeTitle,
    description: safeDescription,
    prepTimeMinutes: Number.isFinite(Number(recipe.prepTimeMinutes)) ? Number(recipe.prepTimeMinutes) : 0,
    cookTimeMinutes: Number.isFinite(Number(recipe.cookTimeMinutes)) ? Number(recipe.cookTimeMinutes) : 0,
    servings: Number.isFinite(Number(recipe.servings)) && Number(recipe.servings) > 0 ? Number(recipe.servings) : 4,
    categories: safeCategories,
    ingredients: safeIngredients,
    instructions: safeInstructions,
    rating: Number.isFinite(Number(recipe.rating)) ? Number(recipe.rating) : 5,
    favorite: Boolean(recipe.favorite),
    createdAt: (recipe.createdAt || new Date().toISOString()).slice(0, 50),
    updatedAt: new Date().toISOString().slice(0, 50),
    ...(safeComments !== undefined ? { comments: safeComments } : {}),
    ...(safeSourceUrl !== undefined ? { sourceUrl: safeSourceUrl } : {}),
    ...(safeImageUrl !== undefined ? { imageUrl: safeImageUrl } : {}),
  };

  return stripUndefinedDeep(payload);
}

export async function fetchRecipesFromFirestore(userId: string): Promise<Recipe[]> {
  const collectionPath = 'recipes';
  try {
    const q = query(collection(db, collectionPath), where('userId', '==', userId));
    const snapshot = await getDocs(q);
    const recipes: Recipe[] = [];
    snapshot.forEach((docSnap) => {
      recipes.push({ id: docSnap.id, ...(docSnap.data() as Omit<Recipe, 'id'>) });
    });
    return sortRecipesByRecent(recipes);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, collectionPath);
  }
}

export async function saveRecipeToFirestore(recipe: Recipe): Promise<Recipe> {
  const sanitized = sanitizeRecipeForFirestore(recipe, recipe.userId);
  const path = `recipes/${sanitized.id}`;
  markRecipePendingSync(sanitized.id);
  try {
    const docRef = doc(db, 'recipes', sanitized.id);
    await setDoc(docRef, sanitized);
    clearRecipePendingSync(sanitized.id);
    return sanitized;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteRecipeFromFirestore(recipeId: string): Promise<void> {
  const safeId = recipeId.replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, 120);
  const path = `recipes/${safeId}`;
  try {
    const docRef = doc(db, 'recipes', safeId);
    await deleteDoc(docRef);
    clearRecipePendingSync(safeId);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export function sortRecipesByRecent(recipes: Recipe[]): Recipe[] {
  return [...recipes].sort((a, b) => {
    const timeA = new Date(a.updatedAt || a.createdAt || 0).getTime();
    const timeB = new Date(b.updatedAt || b.createdAt || 0).getTime();
    return timeB - timeA;
  });
}

export function subscribeToUserRecipes(
  userId: string,
  onUpdate: (recipes: Recipe[]) => void,
  onError: (err: unknown) => void
) {
  const collectionPath = 'recipes';
  const q = query(collection(db, collectionPath), where('userId', '==', userId));
  return onSnapshot(
    q,
    (snapshot) => {
      const recipes: Recipe[] = [];
      snapshot.forEach((docSnap) => {
        recipes.push({ id: docSnap.id, ...(docSnap.data() as Omit<Recipe, 'id'>) });
      });
      onUpdate(sortRecipesByRecent(recipes));
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, collectionPath);
      } catch (err) {
        onError(err);
      }
    }
  );
}

/**
 * Syncs recipes on login:
 * - If cloud has recipes, also retries uploading any locally pending unsynced recipes so user work is never lost.
 * - If cloud is completely empty (first login), migrates local/starter recipes to Firestore.
 */
export async function syncLocalRecipesToCloud(userId: string): Promise<Recipe[]> {
  const cloudRecipes = await fetchRecipesFromFirestore(userId);
  const localRecipes = getLocalRecipes();
  const pendingIds = new Set(getPendingSyncRecipeIds());

  if (cloudRecipes.length > 0) {
    const cloudMap = new Map(cloudRecipes.map((r) => [r.id, r]));

    // Upload any locally created/edited recipes that previously failed to sync (e.g. offline)
    const unsyncedLocal = localRecipes.filter(
      (r) => pendingIds.has(r.id) || (r.userId === 'default' && !r.id.startsWith('rec_risotto') && !r.id.startsWith('rec_salade') && !r.id.startsWith('rec_saumon') && !r.id.startsWith('rec_curry'))
    );

    for (const localRec of unsyncedLocal) {
      try {
        const uploaded = await saveRecipeToFirestore({
          ...localRec,
          userId,
        });
        cloudMap.set(uploaded.id, uploaded);
      } catch (err) {
        console.warn('Could not upload pending recipe yet:', localRec.id, err);
        cloudMap.set(localRec.id, { ...localRec, userId });
      }
    }

    const merged = sortRecipesByRecent(Array.from(cloudMap.values()));
    saveLocalRecipes(merged);
    return merged;
  }

  // First login with empty cloud: migrate local/starter recipes to Firestore
  const migrated: Recipe[] = [];
  for (const r of localRecipes) {
    const newId = r.id.startsWith('rec_') && !r.id.startsWith(userId) ? `${userId}_${r.id}` : r.id;
    const sanitizedId = newId.replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, 100);
    const updatedRecipe = await saveRecipeToFirestore({
      ...r,
      id: sanitizedId,
      userId,
      updatedAt: new Date().toISOString(),
    });
    migrated.push(updatedRecipe);
  }
  const sorted = sortRecipesByRecent(migrated);
  saveLocalRecipes(sorted);
  return sorted;
}
