import { GroceryCategory, Recipe } from '../types/recipe';

export interface ImportResult {
  success: boolean;
  recipe?: Partial<Recipe>;
  error?: string;
}

function categorizeIngredientLocally(name: string): GroceryCategory {
  const lower = name.toLowerCase();
  if (/tomate|carotte|oignon|poireau|courgette|avocat|citron|salade|épinard|champignon|ail|échalote|pomme|banane|herbe|persil|coriandre|basilic|thym|romarin|gingembre|poivron|concombre|pommes? de terre|haricot|brocoli/.test(lower)) {
    return 'Fruits & Légumes';
  }
  if (/crème|lait|beurre|fromage|chèvre|gruyère|parmesan|feta|yaourt|œuf|oeuf|mozzarella|ricotta|mascarpone/.test(lower)) {
    return 'Produits laitiers & Œufs';
  }
  if (/poulet|saumon|bœuf|boeuf|viande|poisson|jambon|lard|crevette|porc|dinde|thon|cabillaud|canard|veau|agneau|filet|bacon|saucisse/.test(lower)) {
    return 'Boucherie & Poissonnerie';
  }
  if (/sel|poivre|huile|vinaigre|moutarde|curry|piment|sauce|épice|soja|bouillon|paprika|cumin|cannelle|muscade|érable|miel/.test(lower)) {
    return 'Condiments, Huiles & Épices';
  }
  if (/pain|pâte|farine|levure|baguette|brioche|croissant/.test(lower)) {
    return 'Boulangerie & Pâtisserie';
  }
  if (/surgelé|glace|sorbet/.test(lower)) {
    return 'Surgelés & Autre';
  }
  return 'Épicerie & Féculents';
}

function parseRecipeTextLocally(rawText: string, sourceUrl?: string): Partial<Recipe> {
  const lines = rawText.split('\n').map((l) => l.trim()).filter(Boolean);
  const title = (lines[0] || 'Recette importée').replace(/^[#*\-]+\s*/, '').slice(0, 150);

  const prepMatch = rawText.match(/préparation\s*:?\s*(\d+)\s*(?:min|m\b)/i) || rawText.match(/(\d+)\s*(?:min|minutes)/i);
  const cookMatch = rawText.match(/cuisson\s*:?\s*(\d+)\s*(?:min|m\b)/i);
  const servingsMatch = rawText.match(/(\d+)\s*(?:personnes?|pers\.?|portions?)/i);

  const prepTimeMinutes = prepMatch ? parseInt(prepMatch[1], 10) : 15;
  const cookTimeMinutes = cookMatch ? parseInt(cookMatch[1], 10) : 20;
  const servings = servingsMatch ? parseInt(servingsMatch[1], 10) : 4;

  const ingredients: Recipe['ingredients'] = [];
  const instructions: Recipe['instructions'] = [];
  let section: 'header' | 'ingredients' | 'instructions' = 'header';

  const unitRegex =
    /^(?:(\d+(?:[.,]\d+)?|\d+\/\d+)\s*)?(?:(cuillères?\s*à\s*(?:soupe|café|thé)|c\.\s*à\s*(?:soupe|café|thé|s\.|c\.)|kg|ml|cl|dl|g|l|tasses?|pincées?|gousses?|branches?|tranches?|boîtes?|filets?|sachets?)\b\s*)?(?:(?:de|d['’])\s*)?(.+)$/i;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (/^ingrédients?\b/i.test(line) && line.length < 35) {
      section = 'ingredients';
      continue;
    }
    if (/^(?:préparation|instructions?|étapes?|déroulé|marche à suivre)\b/i.test(line) && line.length < 40) {
      section = 'instructions';
      continue;
    }

    if (section === 'instructions' || (/^\d+[.)]\s+/.test(line) && line.length > 20)) {
      section = 'instructions';
      const cleanedStep = line.replace(/^\d+[.)\-]\s*/, '').trim();
      if (cleanedStep.length > 4) {
        const dur = cleanedStep.match(/(\d+)\s*(?:min|minutes)/i);
        instructions.push({
          stepNumber: instructions.length + 1,
          text: cleanedStep,
          ...(dur ? { durationMinutes: parseInt(dur[1], 10) } : {}),
        });
      }
    } else if (section === 'ingredients' || /^[-•*]\s+/.test(line)) {
      const cleanedIng = line.replace(/^[-•*]\s+/, '').trim();
      if (!cleanedIng || cleanedIng.length > 140) continue;
      const m = cleanedIng.match(unitRegex);
      const amount = m?.[1] || '';
      const unit = (m?.[2] || '').toLowerCase();
      const rawName = (m?.[3] || cleanedIng).replace(/^(?:de|d['’])\s*/i, '').trim();
      const name = rawName ? rawName.charAt(0).toUpperCase() + rawName.slice(1) : cleanedIng;
      ingredients.push({
        id: `ing_${ingredients.length}_${Date.now()}`,
        name,
        amount,
        unit,
        category: categorizeIngredientLocally(name),
      });
    }
  }

  if (instructions.length === 0) {
    instructions.push({ stepNumber: 1, text: 'Préparer et cuisiner les ingrédients selon la recette.' });
  }

  const categories: string[] = ['plat principal'];
  if (!/poulet|viande|bœuf|boeuf|lard|jambon|porc|poisson|saumon|thon|crevette/i.test(rawText)) {
    categories.push('végétarien');
  }
  if (prepTimeMinutes + cookTimeMinutes <= 30) {
    categories.push('rapide');
  }

  return {
    title,
    description: 'Recette extraite localement, prête à personnaliser.',
    prepTimeMinutes,
    cookTimeMinutes,
    servings,
    categories,
    ingredients:
      ingredients.length > 0
        ? ingredients
        : [{ id: `ing_0_${Date.now()}`, name: 'Ingrédients de la recette', amount: 1, unit: '', category: 'Épicerie & Féculents' }],
    instructions,
    ...(sourceUrl ? { sourceUrl } : {}),
  };
}

export async function importRecipeFromWeb(url?: string, rawText?: string): Promise<ImportResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000);

  try {
    const res = await fetch('/api/import-recipe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url, rawText }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      throw new Error('NO_BACKEND');
    }

    const data = await res.json();
    if (!res.ok || !data.success) {
      return {
        success: false,
        error: data.error || 'Impossible d\'importer la recette. Vérifiez l\'adresse ou collez le texte directement.',
      };
    }

    return {
      success: true,
      recipe: data.recipe,
    };
  } catch (err: any) {
    clearTimeout(timeoutId);

    // Offline or static-hosting fallback: parse pasted recipe text directly in the browser
    if (rawText && rawText.trim().length >= 15) {
      return {
        success: true,
        recipe: parseRecipeTextLocally(rawText, url),
      };
    }

    if (err?.name === 'AbortError') {
      return {
        success: false,
        error: 'Le site cible a mis plus de 20 secondes à répondre. Copiez-collez le texte de la recette dans l\'onglet « Copier-coller le texte » (fonctionne même sans serveur).',
      };
    }
    return {
      success: false,
      error: 'L\'extraction automatique par lien nécessite le serveur Node (Cloud Run / Render / PC). Utilisez l\'onglet « Copier-coller le texte » pour importer instantanément 100 % localement !',
    };
  }
}

export const DEMO_URL_EXAMPLES = [
  {
    name: 'Gratin Dauphinois traditionnel',
    url: 'https://fr.wikipedia.org/wiki/Gratin_dauphinois',
    description: 'Recette classique française aux pommes de terre et crème',
  },
  {
    name: 'Ratatouille provençale',
    url: 'https://fr.wikipedia.org/wiki/Ratatouille',
    description: 'Mijoté de légumes du soleil aux herbes de Provence',
  },
  {
    name: 'Tarte Tatin aux pommes',
    url: 'https://fr.wikipedia.org/wiki/Tarte_Tatin',
    description: 'Célèbre dessert caramélisé renversé',
  }
];

export const DEMO_TEXT_EXAMPLE = `Quiche fondante aux poireaux et fromage de chèvre
Temps de préparation: 15 min
Temps de cuisson: 30 min
Portions: 4 personnes

Ingrédients:
- 1 pâte brisée pur beurre
- 3 blancs de poireaux émincés
- 1 bûche de fromage de chèvre (150g)
- 3 gros œufs frais
- 20 cl de crème fraîche épaisse
- 10 cl de lait entier
- 1 c. à soupe d'huile d'olive
- 1 pincée de noix de muscade râpée
- Sel et poivre du moulin

Préparation:
1. Laver et émincer finement les poireaux. Les faire fondre à feu doux dans une poêle avec l'huile d'olive pendant 10 minutes jusqu'à ce qu'ils soient bien tendres.
2. Préchauffer le four à 180°C. Dérouler la pâte brisée dans un moule à tarte et piquer le fond avec une fourchette.
3. Dans un saladier, battre les œufs avec la crème, le lait, la muscade, le sel et le poivre.
4. Répartir la fondue de poireaux sur le fond de tarte. Couper le fromage de chèvre en rondelles et les disposer harmonieusement sur les poireaux.
5. Verser l'appareil aux œufs par-dessus.
6. Enfourner pour 30 minutes de cuisson jusqu'à ce que la quiche soit bien dorée et gonflée. Servir tiède avec une salade verte.`;
