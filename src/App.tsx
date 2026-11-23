import React, { useState, useEffect, useCallback } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { AlertCircle, Cloud, RefreshCw, X } from 'lucide-react';
import { auth, completeRedirectLogin, loginWithGoogle, testConnection } from './services/firebase';
import { Recipe, MealPlan, GroceryList } from './types/recipe';
import {
  getLocalRecipes,
  saveLocalRecipes,
  getPendingSyncRecipeIds,
  saveRecipeToFirestore,
  deleteRecipeFromFirestore,
  subscribeToUserRecipes,
  syncLocalRecipesToCloud,
  sortRecipesByRecent,
} from './services/recipeService';
import {
  getMondayOfWeek,
  formatWeekRange,
  getLocalMealPlan,
  saveLocalMealPlan,
  saveMealPlanToFirestore,
  subscribeToMealPlan,
} from './services/mealPlanService';
import {
  getLocalGroceryList,
  saveLocalGroceryList,
  saveGroceryListToFirestore,
  subscribeToGroceryList,
  generateGroceryListFromPlan,
  getLocalPantryStaples,
  saveLocalPantryStaples,
} from './services/groceryService';

import { Header, SyncStatus } from './components/Header';
import { Navigation, AppTab } from './components/Navigation';
import { RecipeBookView } from './components/RecipeBookView';
import { MealPlannerView } from './components/MealPlannerView';
import { GroceryListView } from './components/GroceryListView';
import { RecipeDetailModal } from './components/RecipeDetailModal';
import { RecipeEditorModal } from './components/RecipeEditorModal';
import { WebImportModal } from './components/WebImportModal';
import { QuickAddToPlanModal } from './components/QuickAddToPlanModal';
import { InstallGuideModal } from './components/InstallGuideModal';
import { OfflineIndicator } from './components/OfflineIndicator';

function formatSyncError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err || '');
  try {
    const parsed = JSON.parse(raw);
    const inner = String(parsed?.error || '');
    if (inner.includes('permission-denied') || inner.includes('Missing or insufficient permissions')) {
      return 'Accès Cloud refusé. Reconnectez-vous ou réessayez la synchronisation.';
    }
    if (inner.includes('offline') || inner.includes('unavailable') || inner.includes('network')) {
      return 'Connexion réseau indisponible. Vos modifications sont gardées localement et seront envoyées dès le retour en ligne.';
    }
    if (inner) {
      return `Erreur de synchronisation Cloud : ${inner}`;
    }
  } catch {
    // not JSON
  }
  if (raw.includes('offline') || raw.includes('network')) {
    return 'Hors ligne : vos données sont conservées localement en attendant la reconnexion.';
  }
  return 'La synchronisation Cloud a échoué. Cliquez sur « Réessayer » pour renvoyer vos modifications.';
}

export default function App() {
  // Current user & auth
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isInitialCloudSyncDone, setIsInitialCloudSyncDone] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('local');
  const [syncError, setSyncError] = useState<string | null>(null);
  const [dismissLocalNotice, setDismissLocalNotice] = useState(false);

  // Active navigation tab
  const [currentTab, setCurrentTab] = useState<AppTab>('recipes');

  // State data
  const [recipes, setRecipes] = useState<Recipe[]>(() => getLocalRecipes());
  const [currentMonday, setCurrentMonday] = useState<string>(() => getMondayOfWeek(new Date()));
  const [mealPlan, setMealPlan] = useState<MealPlan>(() => getLocalMealPlan(getMondayOfWeek(new Date())));
  const [groceryList, setGroceryList] = useState<GroceryList>(() => getLocalGroceryList(getMondayOfWeek(new Date())));
  const [pantryStaples, setPantryStaples] = useState<string[]>(() => getLocalPantryStaples());

  // Modals state
  const [selectedRecipeDetail, setSelectedRecipeDetail] = useState<Recipe | null>(null);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isImporterOpen, setIsImporterOpen] = useState(false);
  const [isInstallGuideOpen, setIsInstallGuideOpen] = useState(false);
  const [quickPlanRecipe, setQuickPlanRecipe] = useState<{ recipe: Recipe; servings?: number } | null>(null);

  // Boot: complete any iOS redirect sign-in and verify Firestore connectivity
  useEffect(() => {
    completeRedirectLogin().catch(() => {});
    testConnection().catch(() => {});
  }, []);

  // Auth observer & initial cloud sync
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      setIsAuthReady(true);

      if (user) {
        setIsInitialCloudSyncDone(false);
        setSyncStatus('syncing');
        setSyncError(null);
        try {
          const syncedRecipes = await syncLocalRecipesToCloud(user.uid);
          setRecipes(syncedRecipes);
          setSyncStatus('synced');
        } catch (err) {
          console.error('Error syncing recipes with cloud on login:', err);
          setSyncStatus('error');
          setSyncError(formatSyncError(err));
        } finally {
          setIsInitialCloudSyncDone(true);
        }
      } else {
        setIsInitialCloudSyncDone(false);
        setSyncStatus('local');
        setSyncError(null);
        setRecipes(getLocalRecipes());
        setMealPlan(getLocalMealPlan(currentMonday));
        setGroceryList(getLocalGroceryList(currentMonday));
        setPantryStaples(getLocalPantryStaples());
      }
    });

    return () => unsubscribe();
  }, []);

  // Real-time Firestore recipes subscription (only starts after initial sync finishes)
  useEffect(() => {
    if (!currentUser || !isInitialCloudSyncDone) return;

    const unsubscribe = subscribeToUserRecipes(
      currentUser.uid,
      (cloudRecipes) => {
        // Keep any locally pending recipes that have not finished uploading yet
        const pendingIds = new Set(getPendingSyncRecipeIds());
        let merged = cloudRecipes;

        if (pendingIds.size > 0) {
          const cloudMap = new Map(cloudRecipes.map((r) => [r.id, r]));
          const localRecipes = getLocalRecipes();
          for (const localRec of localRecipes) {
            if (pendingIds.has(localRec.id) && !cloudMap.has(localRec.id)) {
              cloudMap.set(localRec.id, localRec);
            }
          }
          merged = sortRecipesByRecent(Array.from(cloudMap.values()));
        }

        setRecipes(merged);
        saveLocalRecipes(merged);

        // Keep open detail modal up-to-date if recipe was edited on another device
        setSelectedRecipeDetail((prev) => {
          if (!prev) return null;
          const updated = merged.find((r) => r.id === prev.id);
          return updated || null;
        });

        if (pendingIds.size === 0) {
          setSyncStatus('synced');
          setSyncError(null);
        }
      },
      (error) => {
        console.warn('Recipes subscription error:', error);
        setSyncStatus('error');
        setSyncError(formatSyncError(error));
      }
    );

    return () => unsubscribe();
  }, [currentUser, isInitialCloudSyncDone]);

  // Real-time Firestore subscriptions for current week's meal plan & grocery list
  useEffect(() => {
    if (!currentUser) {
      setMealPlan(getLocalMealPlan(currentMonday));
      setGroceryList(getLocalGroceryList(currentMonday));
      return;
    }

    if (!isInitialCloudSyncDone) return;

    // Show local cache immediately while real-time listener connects
    const cachedPlan = getLocalMealPlan(currentMonday);
    const cachedGrocery = getLocalGroceryList(currentMonday);
    setMealPlan({ ...cachedPlan, userId: currentUser.uid });
    setGroceryList({ ...cachedGrocery, userId: currentUser.uid });

    const unsubPlan = subscribeToMealPlan(
      currentUser.uid,
      currentMonday,
      (cloudPlan) => {
        if (cloudPlan) {
          setMealPlan(cloudPlan);
          saveLocalMealPlan(cloudPlan);
        } else {
          // If local device already had meals scheduled for this week before login, push them once
          const local = getLocalMealPlan(currentMonday);
          const hasLocalSlots = Object.values(local.slots || {}).some((items) => items && items.length > 0);
          if (hasLocalSlots && local.userId === 'default') {
            const migratedPlan: MealPlan = {
              ...local,
              userId: currentUser.uid,
              updatedAt: new Date().toISOString(),
            };
            saveLocalMealPlan(migratedPlan);
            setMealPlan(migratedPlan);
            saveMealPlanToFirestore(migratedPlan).catch((err) => {
              console.warn('Could not migrate local meal plan:', err);
            });
          } else {
            const emptyPlan: MealPlan = {
              id: `plan_${currentUser.uid}_${currentMonday.replace(/-/g, '_')}`,
              userId: currentUser.uid,
              weekStartDate: currentMonday,
              slots: {},
              updatedAt: new Date().toISOString(),
            };
            setMealPlan(emptyPlan);
            saveLocalMealPlan(emptyPlan);
          }
        }
      },
      (error) => {
        console.warn('Meal plan subscription error:', error);
      }
    );

    const unsubGrocery = subscribeToGroceryList(
      currentUser.uid,
      currentMonday,
      (cloudGrocery) => {
        if (cloudGrocery) {
          setGroceryList(cloudGrocery);
          saveLocalGroceryList(cloudGrocery);
          if (Array.isArray(cloudGrocery.pantryStaples)) {
            setPantryStaples(cloudGrocery.pantryStaples);
            saveLocalPantryStaples(cloudGrocery.pantryStaples);
          }
        } else {
          const local = getLocalGroceryList(currentMonday);
          if ((local.items || []).length > 0 && local.userId === 'default') {
            const migratedList: GroceryList = {
              ...local,
              userId: currentUser.uid,
              updatedAt: new Date().toISOString(),
            };
            saveLocalGroceryList(migratedList);
            setGroceryList(migratedList);
            saveGroceryListToFirestore(migratedList).catch((err) => {
              console.warn('Could not migrate local grocery list:', err);
            });
          } else {
            const emptyList: GroceryList = {
              id: `list_${currentUser.uid}_${currentMonday.replace(/-/g, '_')}`,
              userId: currentUser.uid,
              weekStartDate: currentMonday,
              items: [],
              pantryStaples: getLocalPantryStaples(),
              updatedAt: new Date().toISOString(),
            };
            setGroceryList(emptyList);
            saveLocalGroceryList(emptyList);
          }
        }
      },
      (error) => {
        console.warn('Grocery list subscription error:', error);
      }
    );

    return () => {
      unsubPlan();
      unsubGrocery();
    };
  }, [currentMonday, currentUser, isInitialCloudSyncDone]);

  // Manual force sync (retries any pending local recipes + refreshes cloud data)
  const handleManualSync = useCallback(async () => {
    if (!currentUser) {
      try {
        await loginWithGoogle();
      } catch (err) {
        setSyncError(formatSyncError(err));
      }
      return;
    }

    setSyncStatus('syncing');
    setSyncError(null);
    try {
      const syncedRecipes = await syncLocalRecipesToCloud(currentUser.uid);
      setRecipes(syncedRecipes);
      setSyncStatus('synced');
    } catch (err) {
      console.error('Manual sync failed:', err);
      setSyncStatus('error');
      setSyncError(formatSyncError(err));
    }
  }, [currentUser]);

  // Handle Save Recipe (Create or Edit)
  const handleSaveRecipe = async (saved: Recipe) => {
    const userToAssign = currentUser?.uid || 'default';
    const finalRecipe: Recipe = {
      ...saved,
      userId: userToAssign,
      updatedAt: new Date().toISOString(),
    };

    // Optimistic state & local storage update using functional updater
    setRecipes((prev) => {
      const exists = prev.some((r) => r.id === finalRecipe.id);
      const next = exists
        ? prev.map((r) => (r.id === finalRecipe.id ? finalRecipe : r))
        : [finalRecipe, ...prev];
      saveLocalRecipes(next);
      return next;
    });

    // If modal is open for detail, update it immediately
    setSelectedRecipeDetail((prev) => (prev?.id === finalRecipe.id ? finalRecipe : prev));

    // Save to Firestore if authenticated
    if (currentUser) {
      setSyncStatus('syncing');
      setSyncError(null);
      try {
        const persisted = await saveRecipeToFirestore(finalRecipe);
        setRecipes((prev) => {
          const next = prev.map((r) => (r.id === persisted.id ? persisted : r));
          saveLocalRecipes(next);
          return next;
        });
        setSelectedRecipeDetail((prev) => (prev?.id === persisted.id ? persisted : prev));
        setSyncStatus('synced');
      } catch (err) {
        console.error('Failed to save recipe to Firestore:', err);
        setSyncStatus('error');
        setSyncError(formatSyncError(err));
      }
    }
  };

  // Handle Delete Recipe
  const handleDeleteRecipe = async (recipeId: string) => {
    setRecipes((prev) => {
      const next = prev.filter((r) => r.id !== recipeId);
      saveLocalRecipes(next);
      return next;
    });

    setSelectedRecipeDetail((prev) => (prev?.id === recipeId ? null : prev));

    if (currentUser) {
      setSyncStatus('syncing');
      setSyncError(null);
      try {
        await deleteRecipeFromFirestore(recipeId);
        setSyncStatus('synced');
      } catch (err) {
        console.error('Failed to delete recipe from Firestore:', err);
        setSyncStatus('error');
        setSyncError(formatSyncError(err));
      }
    }
  };

  // Handle Favorite toggle
  const handleToggleFavorite = (recipe: Recipe, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated: Recipe = {
      ...recipe,
      favorite: !recipe.favorite,
      updatedAt: new Date().toISOString(),
    };
    handleSaveRecipe(updated);
  };

  // Handle Update Meal Plan
  const handleUpdateMealPlan = async (updatedPlan: MealPlan) => {
    const planToSave: MealPlan = {
      ...updatedPlan,
      userId: currentUser?.uid || 'default',
      updatedAt: new Date().toISOString(),
    };

    setMealPlan(planToSave);
    saveLocalMealPlan(planToSave);

    if (currentUser) {
      setSyncStatus('syncing');
      setSyncError(null);
      try {
        await saveMealPlanToFirestore(planToSave);
        setSyncStatus('synced');
      } catch (err) {
        console.error('Failed to save meal plan to Firestore:', err);
        setSyncStatus('error');
        setSyncError(formatSyncError(err));
      }
    }
  };

  // Handle Update Grocery List
  const handleUpdateGroceryList = async (updatedList: GroceryList) => {
    const listToSave: GroceryList = {
      ...updatedList,
      userId: currentUser?.uid || 'default',
      updatedAt: new Date().toISOString(),
    };

    setGroceryList(listToSave);
    saveLocalGroceryList(listToSave);

    if (currentUser) {
      setSyncStatus('syncing');
      setSyncError(null);
      try {
        await saveGroceryListToFirestore(listToSave);
        setSyncStatus('synced');
      } catch (err) {
        console.error('Failed to save grocery list to Firestore:', err);
        setSyncStatus('error');
        setSyncError(formatSyncError(err));
      }
    }
  };

  // Update Pantry Staples (customizable staples excluded from grocery list)
  const handleUpdatePantryStaples = (newStaples: string[]) => {
    setPantryStaples(newStaples);
    saveLocalPantryStaples(newStaples);
    const updatedList: GroceryList = {
      ...groceryList,
      pantryStaples: newStaples,
      updatedAt: new Date().toISOString(),
    };
    handleUpdateGroceryList(updatedList);
  };

  // Clear entire grocery list
  const handleClearGroceryList = () => {
    const clearedList: GroceryList = {
      ...groceryList,
      items: [],
      updatedAt: new Date().toISOString(),
    };
    handleUpdateGroceryList(clearedList);
  };

  // Generate / Regenerate Grocery List from Meal Plan (excluding pantry staples)
  const handleGenerateGroceryList = (options?: { resetAll?: boolean }) => {
    const isReset = Boolean(options && typeof options === 'object' && options.resetAll === true);
    const staples = pantryStaples.length > 0 ? pantryStaples : getLocalPantryStaples();
    const existing = isReset ? [] : (groceryList.items || []);
    const { items: newItems } = generateGroceryListFromPlan(
      mealPlan,
      recipes,
      existing,
      staples,
      { resetCustomItems: isReset }
    );
    const updatedList: GroceryList = {
      ...groceryList,
      weekStartDate: currentMonday,
      items: newItems,
      pantryStaples: staples,
      updatedAt: new Date().toISOString(),
    };

    handleUpdateGroceryList(updatedList);
    setCurrentTab('grocery');
  };

  // Pending unchecked grocery items count
  const pendingGroceryCount = (groceryList.items || []).filter(i => !i.checked).length;
  const weekRangeText = formatWeekRange(currentMonday);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col selection:bg-orange-100 selection:text-orange-900">
      {/* Top Header */}
      <Header
        currentUser={currentUser}
        syncStatus={syncStatus}
        onManualSync={handleManualSync}
        onOpenImporter={() => setIsImporterOpen(true)}
        onOpenNewRecipe={() => {
          setEditingRecipe(null);
          setIsEditorOpen(true);
        }}
        onOpenInstallGuide={() => setIsInstallGuideOpen(true)}
      />

      {/* Navigation (Desktop Top Tabs & Mobile Bottom Bar) */}
      <Navigation
        currentTab={currentTab}
        onChangeTab={setCurrentTab}
        recipesCount={recipes.length}
        groceryPendingCount={pendingGroceryCount}
      />

      {/* Sync Error Banner */}
      {syncError && (
        <div className="bg-rose-50 border-b border-rose-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between gap-3 text-xs sm:text-sm text-rose-800">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{syncError}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleManualSync}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Réessayer
              </button>
              <button
                type="button"
                onClick={() => setSyncError(null)}
                className="p-1 text-rose-500 hover:text-rose-700"
                aria-label="Fermer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Local-Only Mode Prompt (shown only when signed out) */}
      {isAuthReady && !currentUser && !dismissLocalNotice && !syncError && (
        <div className="bg-amber-50/90 border-b border-amber-200/80">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm text-amber-900">
            <div className="flex items-center gap-2">
              <Cloud className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>Mode local uniquement</strong> — Connectez le même compte Google sur votre PC et votre iPad/iPhone pour synchroniser vos recettes en temps réel.
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleManualSync}
                className="px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold transition-colors"
              >
                Activer Sync Cloud
              </button>
              <button
                type="button"
                onClick={() => setDismissLocalNotice(true)}
                className="p-1 text-amber-600 hover:text-amber-800"
                aria-label="Masquer le message"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main App Content */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full">
        {currentTab === 'recipes' && (
          <RecipeBookView
            recipes={recipes}
            onSelectRecipe={setSelectedRecipeDetail}
            onToggleFavorite={handleToggleFavorite}
            onQuickAddToPlan={(recipe, e) => {
              e.stopPropagation();
              setQuickPlanRecipe({ recipe, servings: recipe.servings || 4 });
            }}
            onDeleteRecipe={handleDeleteRecipe}
            onOpenImporter={() => setIsImporterOpen(true)}
            onOpenNewRecipe={() => {
              setEditingRecipe(null);
              setIsEditorOpen(true);
            }}
          />
        )}

        {currentTab === 'planner' && (
          <MealPlannerView
            currentPlan={mealPlan}
            recipes={recipes}
            onUpdatePlan={handleUpdateMealPlan}
            onGenerateGroceryList={handleGenerateGroceryList}
            onOpenRecipeDetail={setSelectedRecipeDetail}
            weekStartDate={currentMonday}
            onChangeWeek={setCurrentMonday}
          />
        )}

        {currentTab === 'grocery' && (
          <GroceryListView
            groceryList={groceryList}
            pantryStaples={pantryStaples}
            onUpdateGroceryList={handleUpdateGroceryList}
            onUpdatePantryStaples={handleUpdatePantryStaples}
            onRegenerateFromPlan={handleGenerateGroceryList}
            onClearGroceryList={handleClearGroceryList}
            weekRangeText={weekRangeText}
          />
        )}
      </main>

      {/* Recipe Detail Modal */}
      {selectedRecipeDetail && (
        <RecipeDetailModal
          recipe={selectedRecipeDetail}
          isOpen={!!selectedRecipeDetail}
          onClose={() => setSelectedRecipeDetail(null)}
          onEdit={(rec) => {
            setSelectedRecipeDetail(null);
            setEditingRecipe(rec);
            setIsEditorOpen(true);
          }}
          onDelete={handleDeleteRecipe}
          onUpdateRecipe={handleSaveRecipe}
          onAddToPlan={(rec, servings) => {
            setQuickPlanRecipe({ recipe: rec, servings });
          }}
        />
      )}

      {/* Recipe Editor Modal (Create or Edit) */}
      {isEditorOpen && (
        <RecipeEditorModal
          recipe={editingRecipe}
          isOpen={isEditorOpen}
          onClose={() => {
            setIsEditorOpen(false);
            setEditingRecipe(null);
          }}
          onSave={handleSaveRecipe}
          currentUserId={currentUser?.uid || 'default'}
        />
      )}

      {/* Web Recipe Importer Modal */}
      {isImporterOpen && (
        <WebImportModal
          isOpen={isImporterOpen}
          onClose={() => setIsImporterOpen(false)}
          onRecipeImported={(newRecipe) => {
            handleSaveRecipe(newRecipe);
            setSelectedRecipeDetail(newRecipe);
          }}
          currentUserId={currentUser?.uid || 'default'}
        />
      )}

      {/* Quick Add To Plan Modal */}
      {quickPlanRecipe && (
        <QuickAddToPlanModal
          recipe={quickPlanRecipe.recipe}
          defaultServings={quickPlanRecipe.servings}
          isOpen={!!quickPlanRecipe}
          onClose={() => setQuickPlanRecipe(null)}
          currentPlan={mealPlan}
          onUpdatePlan={handleUpdateMealPlan}
          weekRangeText={weekRangeText}
        />
      )}

      {/* Install on iOS & PC Guide Modal */}
      {isInstallGuideOpen && (
        <InstallGuideModal
          isOpen={isInstallGuideOpen}
          onClose={() => setIsInstallGuideOpen(false)}
        />
      )}

      {/* Offline Mode Indicator */}
      <OfflineIndicator />
    </div>
  );
}
