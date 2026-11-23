import express from 'express';
import type { Request, Response } from 'express';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper: parse ISO 8601 duration (e.g. PT15M -> 15, PT1H20M -> 80) or text
function parseDuration(iso: any): number {
  if (!iso) return 0;
  if (typeof iso === 'number') return iso;
  const str = String(iso).trim();
  const match = str.match(/P(?:T(?:(\d+)H)?(?:(\d+)M)?)?/i);
  if (match && (match[1] || match[2])) {
    const h = parseInt(match[1] || '0', 10);
    const m = parseInt(match[2] || '0', 10);
    return h * 60 + m;
  }
  const minMatch = str.match(/(\d+)\s*(?:min|m\b)/i);
  if (minMatch) return parseInt(minMatch[1], 10);
  const hourMatch = str.match(/(\d+)\s*(?:h|heure)/i);
  if (hourMatch) return parseInt(hourMatch[1], 10) * 60;
  return parseInt(str, 10) || 0;
}

// Helper: parse portions/servings
function parseServings(yieldVal: any): number {
  if (!yieldVal) return 4;
  if (typeof yieldVal === 'number') return yieldVal;
  const match = String(yieldVal).match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 4;
}

// Categorize ingredient into supermarket department
function categorizeIngredient(name: string): string {
  const lower = name.toLowerCase();
  if (lower.match(/tomate|carotte|oignon|poireau|courgette|avocat|citron|salade|épinard|champignon|ail|échalote|pomme|banane|herbe|persil|coriandre|basilic|thym|romarin|gingembre|poivron|concombre|pommes? de terre|haricot|brocoli/)) {
    return 'Fruits & Légumes';
  }
  if (lower.match(/crème|lait|beurre|fromage|chèvre|gruyère|parmesan|feta|yaourt|œuf|oeuf|mozzarella|ricotta|mascarpone/)) {
    return 'Produits laitiers & Œufs';
  }
  if (lower.match(/poulet|saumon|bœuf|boeuf|viande|poisson|jambon|lard|crevette|porc|dinde|thon|cabillaud|canard|veau|agneau|filet|bacon|saucisse/)) {
    return 'Boucherie & Poissonnerie';
  }
  if (lower.match(/sel|poivre|huile|vinaigre|moutarde|curry|piment|sauce|épice|soja|bouillon|paprika|cumin|cannelle|muscade/)) {
    return 'Condiments, Huiles & Épices';
  }
  if (lower.match(/pain|pâte|farine|levure|baguette|brioche|croissant/)) {
    return 'Boulangerie & Pâtisserie';
  }
  if (lower.match(/surgelé|glace|sorbet/)) {
    return 'Surgelés & Autre';
  }
  return 'Épicerie & Féculents';
}

// Parse single ingredient line into amount, unit, and clean name
function parseIngredientLine(line: string) {
  const clean = line
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();

  const unitsPattern = [
    'cuillères?\\s*à\\s*(?:soupe|café|thé|dessert)',
    'c\\.\\s*à\\s*(?:soupe|café|thé|s\\.|c\\.)',
    'morceaux?',
    'branches?',
    'tranches?',
    'sachets?',
    'gousses?',
    'feuilles?',
    'pincées?',
    'poignées?',
    'boîtes?',
    'tasses?',
    'filets?',
    'verres?',
    'bouteilles?',
    'pots?',
    'kg',
    'ml',
    'cl',
    'dl',
    'mg',
    'g',
    'l',
  ].join('|');

  const regex = new RegExp(`^(?:(\\d+(?:[.,]\\d+)?|\\d+\\/\\d+)\\s*)?(?:(${unitsPattern})\\b\\s*)?(?:(?:de|d['’])\\s*)?(.+)$`, 'i');
  const m = clean.match(regex);
  if (!m) return { amount: '', unit: '', name: clean };

  let amount = m[1] || '';
  let unit = m[2] ? m[2].toLowerCase() : '';
  let name = (m[3] || clean).replace(/^(?:de|d['’])\s*/i, '').trim();

  if (unit.match(/^filets?$/i)) {
    name = `Filet de ${name}`;
    unit = 'pièces';
  } else if (unit.match(/^gousses?$/i)) {
    name = name.toLowerCase().includes('ail') ? name : `Ail (${name})`;
    unit = 'gousses';
  } else if (unit.match(/^branches?$/i)) {
    name = name.toLowerCase().includes('thym') ? name : `Thym (${name})`;
    unit = 'branches';
  }

  // If amount was "1" and unit was empty, and ingredient was "Sel et poivre" or "Persil haché"
  if (amount === '1' && !unit && /^(?:sel|poivre|huile|beurre|persil)/i.test(name)) {
    amount = '';
  }

  if (name.length > 0) {
    name = name.charAt(0).toUpperCase() + name.slice(1);
  }

  return { amount, unit, name };
}

// Recursive finder for Schema.org Recipe in JSON-LD objects, arrays or @graph
function findRecipeInJsonLd(obj: any): any {
  if (!obj) return null;
  if (Array.isArray(obj)) {
    for (const item of obj) {
      const found = findRecipeInJsonLd(item);
      if (found) return found;
    }
    return null;
  }
  if (typeof obj === 'object') {
    const type = obj['@type'];
    if (type === 'Recipe' || (Array.isArray(type) && type.includes('Recipe'))) {
      return obj;
    }
    if (obj['@graph']) {
      return findRecipeInJsonLd(obj['@graph']);
    }
  }
  return null;
}

// Convert Schema.org Recipe JSON-LD directly into our Recipe schema with 100% accuracy
function convertSchemaRecipeToAppRecipe(schemaRecipe: any, sourceUrl?: string, fallbackImage?: string) {
  const title = (schemaRecipe.name || schemaRecipe.headline || 'Recette importée')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .trim();

  const description = (schemaRecipe.description || '')
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .trim();

  const prepTimeMinutes = parseDuration(schemaRecipe.prepTime) || 15;
  const cookTimeMinutes = parseDuration(schemaRecipe.cookTime) || 20;
  const servings = parseServings(schemaRecipe.recipeYield);

  // Extract best image
  let imageUrl = fallbackImage || '';
  if (schemaRecipe.image) {
    if (typeof schemaRecipe.image === 'string') {
      imageUrl = schemaRecipe.image;
    } else if (Array.isArray(schemaRecipe.image)) {
      imageUrl = typeof schemaRecipe.image[0] === 'string'
        ? schemaRecipe.image[0]
        : (schemaRecipe.image[0]?.url || '');
    } else if (schemaRecipe.image.url) {
      imageUrl = schemaRecipe.image.url;
    }
  }

  // Extract ingredients
  const ingredients: any[] = [];
  const rawIngredients = Array.isArray(schemaRecipe.recipeIngredient)
    ? schemaRecipe.recipeIngredient
    : (typeof schemaRecipe.recipeIngredient === 'string' ? [schemaRecipe.recipeIngredient] : []);

  rawIngredients.forEach((line: string, idx: number) => {
    if (!line || typeof line !== 'string') return;
    const parsed = parseIngredientLine(line);
    if (!parsed.name) return;

    ingredients.push({
      id: `ing_${idx}_${Date.now()}`,
      name: parsed.name,
      amount: parsed.amount,
      unit: parsed.unit,
      category: categorizeIngredient(parsed.name),
    });
  });

  // Extract instructions
  const instructions: any[] = [];
  const rawInstructions = schemaRecipe.recipeInstructions;
  const stepsList: string[] = [];

  function extractSteps(item: any) {
    if (!item) return;
    if (typeof item === 'string') {
      stepsList.push(item);
    } else if (Array.isArray(item)) {
      item.forEach(extractSteps);
    } else if (typeof item === 'object') {
      if (item['@type'] === 'HowToSection' && item.itemListElement) {
        extractSteps(item.itemListElement);
      } else if (item.text) {
        stepsList.push(item.text);
      } else if (item.name && item['@type'] === 'HowToStep') {
        stepsList.push(item.name);
      }
    }
  }

  extractSteps(rawInstructions);

  stepsList.forEach((text, idx) => {
    const cleanText = text
      .replace(/<[^>]*>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&nbsp;/g, ' ')
      .trim();

    if (cleanText.length > 3) {
      const durMatch = cleanText.match(/(\d+)\s*(?:min|minutes)/i);
      instructions.push({
        stepNumber: idx + 1,
        text: cleanText,
        durationMinutes: durMatch ? parseInt(durMatch[1], 10) : undefined,
      });
    }
  });

  // Categories detection
  const categories: string[] = ['plat principal'];
  const totalTime = prepTimeMinutes + cookTimeMinutes;
  if (totalTime > 0 && totalTime <= 30) {
    categories.push('rapide');
  }

  const allText = (title + ' ' + ingredients.map(i => i.name).join(' ')).toLowerCase();
  const hasMeat = /porc|bœuf|boeuf|poulet|veau|agneau|canard|dinde|jambon|bacon|lard|saucisse|viande|saumon|poisson|thon|crevette|crabe|homard/.test(allText);
  if (!hasMeat) {
    categories.push('végétarien');
  }

  if (schemaRecipe.recipeCategory) {
    const cats = Array.isArray(schemaRecipe.recipeCategory) ? schemaRecipe.recipeCategory : [schemaRecipe.recipeCategory];
    cats.forEach((c: any) => {
      if (typeof c === 'string' && c.trim()) {
        const norm = c.trim().toLowerCase();
        if (!categories.includes(norm) && norm.length < 25) {
          categories.push(norm);
        }
      }
    });
  }

  let rating = 5;
  if (schemaRecipe.aggregateRating?.ratingValue) {
    rating = Math.round(Number(schemaRecipe.aggregateRating.ratingValue)) || 5;
  }

  return {
    title,
    description: description || 'Recette importée avec succès.',
    prepTimeMinutes,
    cookTimeMinutes,
    servings,
    categories,
    ingredients,
    instructions,
    imageUrl: imageUrl.replace(/&amp;/g, '&'),
    sourceUrl,
    rating,
    comments: schemaRecipe.author?.name ? `Recette par ${schemaRecipe.author.name}` : undefined,
  };
}

// Fallback: parse raw unstructured text or clean HTML
function parseHeuristicRecipe(content: string, pageTitle: string, url?: string, detectedImage?: string) {
  const lines = content.split('\n').map(l => l.trim()).filter(Boolean);
  const title = pageTitle || (lines.length > 0 ? lines[0].replace(/^[#\*\-]+\s*/, '') : 'Recette importée');

  const timeMatch = content.match(/(\d+)\s*(?:min|minutes|h|heures)/i);
  const prepTime = timeMatch ? parseInt(timeMatch[1], 10) : 15;

  const portionsMatch = content.match(/(\d+)\s*(?:personnes|pers|portions)/i);
  const servings = portionsMatch ? parseInt(portionsMatch[1], 10) : 4;

  const ingredients: any[] = [];
  const instructions: any[] = [];
  let isInstructionSection = false;

  for (const line of lines) {
    if (line.match(/(?:préparation|instructions|étapes|recette|déroulé|marche à suivre)/i) && line.length < 40) {
      isInstructionSection = true;
      continue;
    }

    if (isInstructionSection) {
      // Filter out non-instruction lines (nav links, copyright, donation prompts, etc.)
      const isBoilerplate = /don|compte|connecter|wikipédia|langues|rechercher|licence|partager|cookie|newsletter/i.test(line);
      if (line.length > 12 && !line.startsWith('http') && !isBoilerplate) {
        instructions.push({
          stepNumber: instructions.length + 1,
          text: line.replace(/^\d+[\.\)\-]\s*/, '').trim(),
        });
      }
    } else {
      const isIngLine = line.match(/^[-•*]\s+/) || line.match(/^\d+\s*(?:g|ml|cl|kg|cuillères?|c\.|pincée|sachet|gousse|boîte|paquet)/i);
      if (isIngLine && line.length < 140 && !line.includes('http')) {
        const parsed = parseIngredientLine(line.replace(/^[-•*]\s+/, ''));
        if (parsed.name) {
          ingredients.push({
            id: `ing_${ingredients.length}_${Date.now()}`,
            name: parsed.name,
            amount: parsed.amount,
            unit: parsed.unit,
            category: categorizeIngredient(parsed.name),
          });
        }
      }
    }
  }

  if (instructions.length === 0) {
    instructions.push({
      stepNumber: 1,
      text: 'Préparer et cuisiner les ingrédients selon la recette.',
    });
  }

  const isVeg = !content.match(/poulet|viande|bœuf|boeuf|lard|jambon|porc|poisson|saumon|thon|crevette/i);
  const categories = ['plat principal'];
  if (isVeg) categories.push('végétarien');
  if (prepTime <= 30) categories.push('rapide');

  return {
    title: title.slice(0, 150),
    description: 'Recette extraite prête à personnaliser.',
    prepTimeMinutes: prepTime,
    cookTimeMinutes: 20,
    servings,
    categories,
    ingredients: ingredients.length > 0
      ? ingredients
      : [{ id: 'ing_default', name: 'Ingrédients de la recette', amount: 1, unit: '', category: 'Épicerie & Féculents' }],
    instructions,
    imageUrl: detectedImage,
    sourceUrl: url,
    comments: 'Recette extraite avec succès.',
  };
}

// Call Gemini 3.8 Flash with thinkingLevel.LOW and timeout
async function callGeminiWithFallback(ai: GoogleGenAI, prompt: string) {
  const models = ['gemini-3.8-flash', 'gemini-flash-latest'];
  let lastError: any = null;

  for (const model of models) {
    try {
      const generatePromise = ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          thinkingConfig: model === 'gemini-3.8-flash' ? { thinkingLevel: ThinkingLevel.LOW } : undefined,
          responseMimeType: 'application/json',
        },
      });

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Timeout de l\'IA')), 7000)
      );

      const response = await Promise.race([generatePromise, timeoutPromise]);
      const textOutput = (response as any).text;
      if (textOutput) {
        const cleanJson = textOutput.replace(/```(?:json)?\s*([\s\S]*?)\s*```/g, '$1').trim();
        return JSON.parse(cleanJson);
      }
    } catch (err: any) {
      lastError = err;
      console.warn(`Attempt with ${model} failed:`, err.message || err);
    }
  }

  throw lastError || new Error('Modèle IA indisponible.');
}

async function startServer() {
  const app = express();
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  app.use((req, _res, next) => {
    console.log(`[HTTP] ${req.method} ${req.url}`);
    next();
  });

  app.get('/api/ping', (_req, res) => {
    res.json({ status: 'ok', timestamp: Date.now() });
  });

  app.get('/api/app-info', (_req, res) => {
    const rawUrl = (process.env.APP_URL || '').trim();
    const isValidUrl = /^https?:\/\/.+/.test(rawUrl) && rawUrl !== 'MY_APP_URL';
    res.json({
      appUrl: isValidUrl ? rawUrl.replace(/\/$/, '') : null,
      standalone: true,
    });
  });

  // API endpoint for recipe importation
  app.post('/api/import-recipe', async (req: Request, res: Response) => {
    try {
      const { url, rawText } = req.body || {};

      let contentToAnalyze = rawText || '';
      let pageTitle = '';
      let detectedImage = '';
      let schemaRecipe: any = null;

      if (url && typeof url === 'string') {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 8000);

          const response = await fetch(url.trim(), {
            signal: controller.signal,
            headers: {
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
              'Accept':
                'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
              'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
            },
          });
          clearTimeout(timeoutId);

          if (!response.ok) {
            throw new Error(`Le site a répondu avec le statut ${response.status}`);
          }

          const html = await response.text();

          // 1. Search for Schema.org Recipe in all JSON-LD scripts
          const jsonLdMatches = html.match(/<script[^>]*type=[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi);
          if (jsonLdMatches) {
            for (const match of jsonLdMatches) {
              try {
                const jsonText = match.replace(/<script[^>]*>/i, '').replace(/<\/script>/i, '').trim();
                const parsed = JSON.parse(jsonText);
                schemaRecipe = findRecipeInJsonLd(parsed);
                if (schemaRecipe) break;
              } catch (e) {
                // ignore parse errors
              }
            }
          }

          // 2. Extract OpenGraph image
          const ogImageMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i) ||
                               html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i);
          if (ogImageMatch && ogImageMatch[1]) {
            detectedImage = ogImageMatch[1];
          }

          // 3. Extract HTML title
          const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
          if (titleMatch && titleMatch[1]) {
            pageTitle = titleMatch[1].replace(/&amp;/g, '&').trim();
          }

          // If Schema.org Recipe is present, convert it directly!
          if (schemaRecipe) {
            const finalRecipe = convertSchemaRecipeToAppRecipe(schemaRecipe, url.trim(), detectedImage);
            res.status(200).json({ success: true, recipe: finalRecipe });
            return;
          }

          // Otherwise, clean HTML targeting main/article
          let targetHtml = html;
          const articleMatch = html.match(/<article[\s\S]*?<\/article>/i) || html.match(/<main[\s\S]*?<\/main>/i);
          if (articleMatch) {
            targetHtml = articleMatch[0];
          }

          const cleaned = targetHtml
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
            .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, '')
            .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, '')
            .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, '')
            .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, '')
            .replace(/<aside\b[^<]*(?:(?!<\/aside>)<[^<]*)*<\/aside>/gi, '')
            .replace(/<[^>]+>/g, '\n')
            .replace(/\n\s*\n/g, '\n')
            .trim();

          contentToAnalyze = cleaned.slice(0, 15000);
        } catch (fetchErr: any) {
          if (!contentToAnalyze) {
            res.status(400).json({
              success: false,
              error: `Impossible d'accéder au site (${fetchErr.message}). Vous pouvez copier-coller les ingrédients ou le texte de la recette dans l'onglet 'Copier-coller le texte' !`,
            });
            return;
          }
        }
      }

      if (!contentToAnalyze || contentToAnalyze.trim().length < 15) {
        res.status(400).json({
          success: false,
          error: 'Contenu insuffisant pour extraire une recette. Veuillez coller le texte ou les ingrédients.',
        });
        return;
      }

      const apiKey = process.env.GEMINI_API_KEY;
      let parsedRecipe: any = null;

      if (apiKey) {
        try {
          const ai = new GoogleGenAI({
            apiKey,
            httpOptions: {
              headers: {
                'User-Agent': 'aistudio-build',
              },
            },
          });

          const prompt = `Tu es un chef cuisinier expert et assistant culinaire francophone.
Extrais et structure la recette à partir du texte suivant.

Important:
1. Traduis et normalise tout en français soigné.
2. Détermine les catégories parmi: "végétarien", "rapide" (si total <= 30 min), "plat principal", "entrée", "dessert", "santé", "sans gluten".
3. Pour chaque ingrédient:
   - name: nom de l'ingrédient
   - amount: quantité numérique ou chaîne
   - unit: unité de mesure
   - category: classe strictement dans l'un de ces rayons:
     "Fruits & Légumes", "Produits laitiers & Œufs", "Boucherie & Poissonnerie", "Épicerie & Féculents", "Condiments, Huiles & Épices", "Boulangerie & Pâtisserie", "Surgelés & Autre"
4. Découpe les instructions en étapes claires et concises.

TITRE ESTIMÉ: ${pageTitle}
URL SOURCE: ${url || ''}
CONTENU:
${contentToAnalyze}

Réponds STRICTEMENT avec un JSON valide:
{
  "title": "Nom de la recette",
  "description": "Courte description",
  "prepTimeMinutes": 15,
  "cookTimeMinutes": 20,
  "servings": 4,
  "categories": ["plat principal"],
  "ingredients": [
    { "name": "Filet de porc", "amount": 2, "unit": "filets", "category": "Boucherie & Poissonnerie" }
  ],
  "instructions": [
    { "stepNumber": 1, "text": "...", "durationMinutes": 5 }
  ],
  "comments": ""
}`;

          parsedRecipe = await callGeminiWithFallback(ai, prompt);
        } catch (aiErr) {
          console.warn('AI unavailable, using heuristic fallback:', aiErr);
          parsedRecipe = parseHeuristicRecipe(contentToAnalyze, pageTitle, url, detectedImage);
        }
      } else {
        parsedRecipe = parseHeuristicRecipe(contentToAnalyze, pageTitle, url, detectedImage);
      }

      if (detectedImage && !parsedRecipe.imageUrl) {
        parsedRecipe.imageUrl = detectedImage;
      }
      if (url && !parsedRecipe.sourceUrl) {
        parsedRecipe.sourceUrl = url;
      }

      res.status(200).json({ success: true, recipe: parsedRecipe });
    } catch (err: any) {
      console.error('API Recipe Parse Error:', err);
      res.status(500).json({
        success: false,
        error: err.message || 'Erreur lors de l\'analyse de la recette.',
      });
    }
  });

  const distDir = path.resolve(__dirname, 'dist');
  const hasDistBuild = fs.existsSync(path.join(distDir, 'index.html'));
  const isProd = process.env.DEV_MODE !== 'true' && hasDistBuild;

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: process.env.DISABLE_HMR !== 'true' },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(
      express.static(distDir, {
        setHeaders(res, filePath) {
          if (
            filePath.endsWith('sw.js') ||
            filePath.endsWith('manifest.webmanifest') ||
            filePath.endsWith('index.html')
          ) {
            res.setHeader('Cache-Control', 'no-cache');
          }
        },
      })
    );
    app.get('*', (_req, res) => {
      res.setHeader('Cache-Control', 'no-cache');
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`CuisineSync server (${isProd ? 'production' : 'development'}) running at http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
