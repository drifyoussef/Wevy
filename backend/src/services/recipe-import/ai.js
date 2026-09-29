// Recipe extraction with free AI tiers:
// - Gemini (GEMINI_API_KEY, https://aistudio.google.com/apikey): watches AND listens to the video,
//   answers in JSON constrained by a schema. Primary.
// - Groq (GROQ_API_KEY, https://console.groq.com/keys): text only, used when Gemini fails / is out of quota.

const { ImportError } = require('./errors');

const GEMINI_BASE = 'https://generativelanguage.googleapis.com';
// First one that works wins: an alias that follows Google's current Flash model, then a pinned one
const GEMINI_MODELS = [process.env.GEMINI_MODEL, 'gemini-flash-latest', 'gemini-2.5-flash'].filter(Boolean);
const GROQ_MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';

// Videos up to this size go inline in the request, bigger ones through the Files API (20 MB request cap)
const MAX_INLINE_VIDEO_BYTES = 14 * 1024 * 1024;
const FILE_PROCESSING_TIMEOUT_MS = 90000;

const CATEGORIES = ['produce', 'meat', 'dairy', 'pantry', 'spices', 'other'];
const DIFFICULTIES = ['easy', 'medium', 'hard'];
const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack', 'dessert'];

const RECIPE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    isRecipe: { type: 'BOOLEAN', description: 'false if the content contains no recipe' },
    title: { type: 'STRING' },
    description: { type: 'STRING' },
    ingredients: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          name: { type: 'STRING' },
          quantity: { type: 'NUMBER', nullable: true },
          unit: { type: 'STRING' },
          category: { type: 'STRING', enum: CATEGORIES }
        },
        required: ['name', 'category']
      }
    },
    instructions: { type: 'ARRAY', items: { type: 'STRING' } },
    prepTime: { type: 'INTEGER', nullable: true },
    cookTime: { type: 'INTEGER', nullable: true },
    servings: { type: 'INTEGER', nullable: true },
    difficulty: { type: 'STRING', enum: DIFFICULTIES, nullable: true },
    mealType: { type: 'STRING', enum: MEAL_TYPES, nullable: true },
    tags: { type: 'ARRAY', items: { type: 'STRING' } }
  },
  required: ['isRecipe', 'title', 'ingredients', 'instructions']
};

const INSTRUCTIONS = `Tu es l'assistant cuisine de l'application Mesnia. Tu reçois une publication (vidéo et/ou texte) qui contient normalement une recette. Extrais-la en JSON, en français.

Règles :
- Utilise TOUTES les sources : ce qui est dit dans la vidéo (voix), ce qui est écrit à l'écran, ce qu'on voit cuisiner, la légende, la description, les données structurées et le texte de la page.
- N'invente JAMAIS d'ingrédient ni d'étape qui n'apparaît nulle part. Si une quantité n'est pas donnée, mets quantity à null et unit à "".
- quantity est un nombre (0.5 et non "1/2"). Unités courtes : g, kg, ml, cl, l, c. à soupe, c. à café, pincée, pièce, gousse, tranche, sachet, boîte.
- category de chaque ingrédient : produce (fruits, légumes, herbes fraîches), meat (viande, poisson, fruits de mer), dairy (lait, beurre, crème, fromage, œufs), pantry (épicerie : pâtes, riz, farine, huile, conserves, sauces), spices (épices, sel, poivre), other.
- instructions : étapes courtes et claires, dans l'ordre, une action principale par étape, sans numéro au début.
- prepTime et cookTime en minutes. S'ils ne sont pas indiqués, estime-les à partir des étapes. servings : le nombre de personnes indiqué, sinon une estimation d'après les quantités.
- difficulty : easy, medium ou hard selon la technique. mealType : breakfast, lunch, dinner, snack ou dessert.
- title : le nom du plat (pas la phrase d'accroche de la vidéo). description : une ou deux phrases qui donnent envie.
- tags : 2 à 5 tags courts en minuscules. Utilise « végétarien », « vegan », « protéiné », « sans gluten », « healthy » UNIQUEMENT si c'est vrai pour cette recette, puis le type de cuisine (italien, asiatique...) et le style (rapide, facile, comfort food...).
- Si le contenu ne contient aucune recette, réponds avec isRecipe = false, ingredients = [] et instructions = [].`;

function buildContext(source) {
  const parts = [`Plateforme : ${source.platform}`, `Lien : ${source.finalUrl}`];
  if (source.author) parts.push(`Auteur : ${source.author}`);
  if (source.title) parts.push(`Titre : ${source.title}`);
  if (source.caption) parts.push(`Légende / description :\n"""\n${source.caption}\n"""`);
  if (source.structuredRecipe) {
    parts.push(`Données structurées de la page (schema.org Recipe) :\n${JSON.stringify(source.structuredRecipe).slice(0, 15000)}`);
  }
  if (source.pageText) parts.push(`Texte de la page :\n"""\n${source.pageText}\n"""`);
  if (source.video || source.youtubeUrl) parts.push('La vidéo de la publication est jointe : regarde-la et écoute-la en entier.');
  return parts.join('\n\n');
}

// ---------- Gemini ----------

function geminiHeaders(extra = {}) {
  return { 'x-goog-api-key': process.env.GEMINI_API_KEY, ...extra };
}

/** Resumable upload to the Gemini Files API, then waits until the video is processed. */
async function uploadVideoToGemini(video) {
  const start = await fetch(`${GEMINI_BASE}/upload/v1beta/files`, {
    method: 'POST',
    headers: geminiHeaders({
      'X-Goog-Upload-Protocol': 'resumable',
      'X-Goog-Upload-Command': 'start',
      'X-Goog-Upload-Header-Content-Length': String(video.buffer.length),
      'X-Goog-Upload-Header-Content-Type': video.mimeType,
      'Content-Type': 'application/json'
    }),
    body: JSON.stringify({ file: { display_name: 'mesnia-recipe-video' } })
  });
  const uploadUrl = start.headers.get('x-goog-upload-url');
  if (!start.ok || !uploadUrl) {
    throw new Error(`Gemini upload start failed (${start.status}): ${await start.text()}`);
  }

  const upload = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      'Content-Length': String(video.buffer.length),
      'X-Goog-Upload-Offset': '0',
      'X-Goog-Upload-Command': 'upload, finalize'
    },
    body: video.buffer
  });
  if (!upload.ok) {
    throw new Error(`Gemini upload failed (${upload.status}): ${await upload.text()}`);
  }
  let { file } = await upload.json();

  const deadline = Date.now() + FILE_PROCESSING_TIMEOUT_MS;
  while (file.state === 'PROCESSING') {
    if (Date.now() > deadline) throw new Error('Gemini video processing timed out');
    await new Promise(resolve => setTimeout(resolve, 2000));
    const poll = await fetch(`${GEMINI_BASE}/v1beta/${file.name}`, { headers: geminiHeaders() });
    file = await poll.json();
  }
  if (file.state !== 'ACTIVE') {
    throw new Error(`Gemini could not process the video (state ${file.state})`);
  }
  return file;
}

async function deleteGeminiFile(file) {
  try {
    await fetch(`${GEMINI_BASE}/v1beta/${file.name}`, { method: 'DELETE', headers: geminiHeaders() });
  } catch {
    // Files expire on their own after 48 h
  }
}

async function callGemini(parts) {
  let lastError;
  for (const model of GEMINI_MODELS) {
    const response = await fetch(`${GEMINI_BASE}/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: geminiHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: INSTRUCTIONS }] },
        contents: [{ role: 'user', parts }],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: 'application/json',
          responseSchema: RECIPE_SCHEMA
        }
      }),
      signal: AbortSignal.timeout(120000)
    });

    if (response.ok) {
      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.map(part => part.text || '').join('');
      if (!text) {
        lastError = new Error(`Gemini ${model} returned no content (${data?.candidates?.[0]?.finishReason || data?.promptFeedback?.blockReason || 'unknown'})`);
        continue;
      }
      return { recipe: JSON.parse(text), model };
    }

    // Unknown model, quota, overload: try the next model
    lastError = new Error(`Gemini ${model} error (${response.status}): ${(await response.text()).slice(0, 300)}`);
    if (![400, 404, 429, 500, 503].includes(response.status)) break;
  }
  throw lastError;
}

async function extractWithGemini(source) {
  const parts = [];
  let uploadedFile = null;
  let usedVideo = false;

  try {
    if (source.youtubeUrl) {
      parts.push({ fileData: { fileUri: source.youtubeUrl } });
      usedVideo = true;
    } else if (source.video) {
      if (source.video.buffer.length <= MAX_INLINE_VIDEO_BYTES) {
        parts.push({ inlineData: { mimeType: source.video.mimeType, data: source.video.buffer.toString('base64') } });
      } else {
        uploadedFile = await uploadVideoToGemini(source.video);
        parts.push({ fileData: { mimeType: uploadedFile.mimeType, fileUri: uploadedFile.uri } });
      }
      usedVideo = true;
    }
  } catch (error) {
    // The text is still worth a try without the video
    console.warn('[recipe-import] Video not sent to Gemini:', error.message);
    usedVideo = false;
  }

  parts.push({ text: buildContext(usedVideo ? source : { ...source, video: null, youtubeUrl: null }) });

  try {
    const { recipe, model } = await callGemini(parts);
    return { recipe, model, usedVideo };
  } finally {
    if (uploadedFile) deleteGeminiFile(uploadedFile);
  }
}

// ---------- Groq (text fallback) ----------

async function extractWithGroq(source) {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
    body: JSON.stringify({
      model: GROQ_MODEL,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `${INSTRUCTIONS}\n\nRéponds uniquement avec un objet JSON de la forme :\n${JSON.stringify({
            isRecipe: true, title: '', description: '',
            ingredients: [{ name: '', quantity: null, unit: '', category: 'other' }],
            instructions: [''], prepTime: null, cookTime: null, servings: null,
            difficulty: 'easy', mealType: 'dinner', tags: ['']
          })}`
        },
        { role: 'user', content: buildContext({ ...source, video: null, youtubeUrl: null }) }
      ]
    }),
    signal: AbortSignal.timeout(60000)
  });

  if (!response.ok) {
    throw new Error(`Groq ${GROQ_MODEL} error (${response.status}): ${(await response.text()).slice(0, 300)}`);
  }
  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content || '';
  const json = text.match(/\{[\s\S]*\}/)?.[0];
  if (!json) throw new Error('Groq returned no JSON');
  return { recipe: JSON.parse(json), model: GROQ_MODEL, usedVideo: false };
}

/**
 * @returns {Promise<{recipe: object, model: string, usedVideo: boolean}>}
 */
async function extractWithAI(source) {
  const hasGemini = Boolean(process.env.GEMINI_API_KEY);
  const hasGroq = Boolean(process.env.GROQ_API_KEY);
  if (!hasGemini && !hasGroq) {
    throw new ImportError(503, "L'import par IA n'est pas configuré sur le serveur (GEMINI_API_KEY ou GROQ_API_KEY).");
  }

  const hasText = Boolean(source.caption || source.pageText || source.structuredRecipe || source.title);
  const errors = [];

  if (hasGemini) {
    try {
      return await extractWithGemini(source);
    } catch (error) {
      console.warn('[recipe-import] Gemini failed:', error.message);
      errors.push(error);
    }
  }

  if (hasGroq && hasText) {
    try {
      return await extractWithGroq(source);
    } catch (error) {
      console.warn('[recipe-import] Groq failed:', error.message);
      errors.push(error);
    }
  }

  throw new ImportError(502, "L'IA n'a pas pu analyser ce lien pour le moment. Réessaie dans quelques minutes.", errors[0]);
}

module.exports = { extractWithAI, CATEGORIES, DIFFICULTIES, MEAL_TYPES };
