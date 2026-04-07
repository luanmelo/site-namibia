require('dotenv').config();

const express = require('express');
const path = require('path');

const app = express();
app.disable('x-powered-by');

const PORT = Number(process.env.PORT || 3000);
const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY;
const GOOGLE_PLACE_ID = process.env.GOOGLE_PLACE_ID || '';
const GOOGLE_PLACE_SEARCH_QUERY =
  process.env.GOOGLE_PLACE_SEARCH_QUERY || 'Namibia Oliveira psicologa Sao Paulo';
const GOOGLE_PLACE_LANGUAGE = process.env.GOOGLE_PLACE_LANGUAGE || 'pt-BR';
const GOOGLE_PLACE_REGION = process.env.GOOGLE_PLACE_REGION || 'BR';
const GOOGLE_REVIEWS_LIMIT = Math.max(1, Math.min(10, Number(process.env.GOOGLE_REVIEWS_LIMIT || 6)));

const SEARCH_URL = 'https://places.googleapis.com/v1/places:searchText';
const DETAILS_BASE_URL = 'https://places.googleapis.com/v1/places';

let cachedPlaceId = GOOGLE_PLACE_ID;

app.use(express.static(path.join(__dirname)));

function ensureApiKey() {
  if (!GOOGLE_API_KEY) {
    const error = new Error('Variavel GOOGLE_PLACES_API_KEY nao configurada.');
    error.status = 500;
    throw error;
  }
}

async function googleFetch(url, options) {
  const response = await fetch(url, options);

  if (!response.ok) {
    const body = await response.text();
    const excerpt = body.slice(0, 400);
    const error = new Error(`Google API retornou ${response.status}: ${excerpt}`);
    error.status = 502;
    throw error;
  }

  return response.json();
}

async function resolvePlaceId() {
  if (cachedPlaceId) {
    return cachedPlaceId;
  }

  const payload = {
    textQuery: GOOGLE_PLACE_SEARCH_QUERY,
    languageCode: GOOGLE_PLACE_LANGUAGE,
    regionCode: GOOGLE_PLACE_REGION,
    pageSize: 1,
  };

  const data = await googleFetch(SEARCH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': GOOGLE_API_KEY,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.googleMapsUri',
    },
    body: JSON.stringify(payload),
  });

  const firstPlace = Array.isArray(data.places) ? data.places[0] : null;

  if (!firstPlace?.id) {
    const error = new Error('Nenhum local encontrado para a busca configurada.');
    error.status = 404;
    throw error;
  }

  cachedPlaceId = firstPlace.id;
  return cachedPlaceId;
}

function normalizeReview(review) {
  const text = typeof review?.text === 'string' ? review.text : review?.text?.text || '';

  return {
    rating: Number(review?.rating || 0),
    text,
    publishTime: review?.publishTime || '',
    relativePublishTimeDescription: review?.relativePublishTimeDescription || '',
    authorName: review?.authorAttribution?.displayName || '',
    authorUri: review?.authorAttribution?.uri || '',
    googleMapsUri: review?.googleMapsUri || '',
    flagContentUri: review?.flagContentUri || '',
  };
}

function toUnixTime(value) {
  const parsed = Date.parse(value || '');
  return Number.isFinite(parsed) ? parsed : 0;
}

async function fetchPlaceDetails(placeId) {
  const detailsUrl = `${DETAILS_BASE_URL}/${encodeURIComponent(placeId)}?languageCode=${encodeURIComponent(
    GOOGLE_PLACE_LANGUAGE
  )}&regionCode=${encodeURIComponent(GOOGLE_PLACE_REGION)}`;

  return googleFetch(detailsUrl, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': GOOGLE_API_KEY,
      'X-Goog-FieldMask': 'id,displayName,rating,userRatingCount,reviews,googleMapsUri',
    },
  });
}

app.get('/api/google-reviews', async (_req, res) => {
  try {
    ensureApiKey();

    const placeId = await resolvePlaceId();
    const place = await fetchPlaceDetails(placeId);

    const reviews = Array.isArray(place.reviews)
      ? place.reviews.map(normalizeReview).filter((review) => review.text || review.rating > 0)
      : [];
    const reviewsSorted = reviews.sort((a, b) => toUnixTime(b.publishTime) - toUnixTime(a.publishTime));

    res.setHeader('Cache-Control', 'public, max-age=300');
    res.json({
      placeId: place.id || placeId,
      placeName: place.displayName?.text || 'Perfil no Google',
      rating: Number(place.rating || 0),
      userRatingCount: Number(place.userRatingCount || 0),
      googleMapsUri: place.googleMapsUri || '',
      requestedReviewCount: GOOGLE_REVIEWS_LIMIT,
      reviewsReturnedFromGoogle: reviewsSorted.length,
      reviews: reviewsSorted.slice(0, GOOGLE_REVIEWS_LIMIT),
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    const status = Number(error?.status || 500);
    res.status(status).json({
      error: 'google_reviews_unavailable',
      message: error?.message || 'Nao foi possivel carregar avaliacoes do Google.',
    });
  }
});

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Servidor ativo em http://localhost:${PORT}`);
});
