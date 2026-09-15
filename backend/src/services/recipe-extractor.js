// Recipe extraction using Groq (free tier, available in the EU).
// Get a key at https://console.groq.com/keys and set GROQ_API_KEY.

const GROQ_MODEL = 'llama-3.3-70b-versatile';

function detectSourcePlatform(url) {
  if (url.includes('tiktok.com')) return 'tiktok';
  if (url.includes('instagram.com')) return 'instagram';
  return 'url';
}

// Fetch the caption/description of a video or page.
// TikTok and Instagram expose a free oEmbed endpoint that returns the caption
// in its `title` field. For anything else we fall back to the page's HTML
// meta description.
async function fetchSourceContext(url) {
  const platform = detectSourcePlatform(url);

  try {
    if (platform === 'tiktok') {
      const res = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`);
      if (res.ok) {
        const data = await res.json();
        return {
          caption: data.title || '',
          author: data.author_name || '',
          thumbnail: data.thumbnail_url || ''
        };
      }
    }

    if (platform === 'instagram') {
      const res = await fetch(`https://api.instagram.com/oembed?url=${encodeURIComponent(url)}`);
      if (res.ok) {
        const data = await res.json();
        return {
          caption: data.title || '',
          author: data.author_name || '',
          thumbnail: data.thumbnail_url || ''
        };
      }
    }

    // Generic fallback: grab the page and pull the og:description / meta description
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; WevyBot/1.0)' } });
    if (res.ok) {
      const html = await res.text();
      const ogDesc = html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i);
      const metaDesc = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i);
      const ogTitle = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i);
      return {
        caption: (ogDesc?.[1] || metaDesc?.[1] || ogTitle?.[1] || '').replace(/&amp;/g, '&'),
        author: '',
        thumbnail: ''
      };
    }
  } catch (err) {
    console.warn('[recipe-extractor] Could not fetch source context:', err.message);
  }

  return { caption: '', author: '', thumbnail: '' };
}

async function callLLM(prompt) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('GROQ_API_KEY is not configured');
  }

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.4
    })
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Groq API error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text) {
    throw new Error('No recipe could be extracted from this URL');
  }

  return JSON.parse(text);
}

async function extractRecipeFromUrl(url) {
  const platform = detectSourcePlatform(url);
  const { caption, author, thumbnail } = await fetchSourceContext(url);

  const prompt = `Tu es un assistant qui extrait des recettes de cuisine à partir de publications de réseaux sociaux.

Voici les informations d'une vidéo/publication ${platform} :
- Auteur : ${author || 'inconnu'}
- Légende / description :
"""
${caption || '(aucune légende disponible)'}
"""

À partir de ces informations, déduis une recette structurée en français.
- Si des ingrédients sont listés, extrais-les avec leur quantité et unité quand c'est possible.
- Si les étapes ne sont pas explicites, déduis des instructions plausibles à partir du contexte.
- Estime prepTime, cookTime (en minutes) et servings de façon réaliste.
- Si la légende est vide ou ne contient pas de recette, crée une recette plausible basée sur le titre/auteur, avec une description indiquant qu'elle doit être vérifiée.

Réponds UNIQUEMENT avec un objet JSON respectant exactement cette structure :
{
  "title": "string",
  "description": "string",
  "ingredients": [
    { "name": "string", "quantity": number | null, "unit": "string", "category": "produce | meat | dairy | pantry | spices | other" }
  ],
  "instructions": ["string"],
  "prepTime": number,
  "cookTime": number,
  "servings": number,
  "difficulty": "easy | medium | hard",
  "mealType": "breakfast | lunch | dinner | snack | dessert",
  "tags": ["string"]
}`;

  const parsed = await callLLM(prompt);

  return {
    ...parsed,
    sourceUrl: url,
    sourcePlatform: platform,
    imageUrl: thumbnail || undefined,
    totalTime: (parsed.prepTime || 0) + (parsed.cookTime || 0)
  };
}

module.exports = { extractRecipeFromUrl };
