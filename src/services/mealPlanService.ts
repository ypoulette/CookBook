import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, stripUndefinedDeep } from './firebase';
import { MealPlan } from '../types/recipe';

const LOCAL_STORAGE_MEALPLAN_PREFIX = 'cuisinesync_mealplan_';

export function getMondayOfWeek(d: Date = new Date()): string {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
  date.setDate(diff);
  return date.toISOString().split('T')[0];
}

export function formatWeekRange(mondayDateString: string): string {
  try {
    const monday = new Date(mondayDateString + 'T00:00:00');
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const formatter = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' });
    const yearFormatter = new Intl.DateTimeFormat('fr-FR', { year: 'numeric' });

    return `${formatter.format(monday)} – ${formatter.format(sunday)} ${yearFormatter.format(sunday)}`;
  } catch {
    return mondayDateString;
  }
}

export function getLocalMealPlan(weekStartDate: string): MealPlan {
  try {
    const key = LOCAL_STORAGE_MEALPLAN_PREFIX + weekStartDate;
    const raw = localStorage.getItem(key);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    // ignore
  }

  return {
    id: `local_${weekStartDate.replace(/-/g, '_')}`,
    userId: 'default',
    weekStartDate,
    slots: {},
    updatedAt: new Date().toISOString(),
  };
}

export function saveLocalMealPlan(plan: MealPlan) {
  try {
    localStorage.setItem(LOCAL_STORAGE_MEALPLAN_PREFIX + plan.weekStartDate, JSON.stringify(plan));
  } catch (e) {
    console.error('Failed to save meal plan locally', e);
  }
}

export function getMealPlanDocId(userId: string, weekStartDate: string): string {
  const safeWeek = weekStartDate.replace(/[^a-zA-Z0-9_\-]/g, '_');
  const safeUser = userId.replace(/[^a-zA-Z0-9_\-]/g, '_');
  return `plan_${safeUser}_${safeWeek}`.slice(0, 100);
}

export async function fetchMealPlanFromFirestore(userId: string, weekStartDate: string): Promise<MealPlan | null> {
  const planId = getMealPlanDocId(userId, weekStartDate);
  const path = `meal_plans/${planId}`;
  try {
    const docRef = doc(db, 'meal_plans', planId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as MealPlan;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export function subscribeToMealPlan(
  userId: string,
  weekStartDate: string,
  onUpdate: (plan: MealPlan | null) => void,
  onError: (err: unknown) => void
) {
  const planId = getMealPlanDocId(userId, weekStartDate);
  const path = `meal_plans/${planId}`;
  const docRef = doc(db, 'meal_plans', planId);

  return onSnapshot(
    docRef,
    (snap) => {
      if (snap.exists()) {
        onUpdate(snap.data() as MealPlan);
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

export async function saveMealPlanToFirestore(plan: MealPlan): Promise<void> {
  const planId = getMealPlanDocId(plan.userId, plan.weekStartDate);
  const path = `meal_plans/${planId}`;
  try {
    const docRef = doc(db, 'meal_plans', planId);
    const sanitized = stripUndefinedDeep({
      id: planId,
      userId: plan.userId,
      weekStartDate: String(plan.weekStartDate || '').slice(0, 30),
      slots: plan.slots || {},
      updatedAt: new Date().toISOString().slice(0, 50),
    });
    await setDoc(docRef, sanitized);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}
