const menuToggle = document.querySelector('.menu-toggle');
const menu = document.querySelector('.menu');

if (menuToggle && menu) {
  menuToggle.addEventListener('click', () => {
    const isOpen = menu.classList.toggle('is-open');
    menuToggle.setAttribute('aria-expanded', String(isOpen));
  });

  menu.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      menu.classList.remove('is-open');
      menuToggle.setAttribute('aria-expanded', 'false');
    });
  });
}

const topLinks = document.querySelectorAll('a[href="#topo"]');
if (topLinks.length > 0) {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  topLinks.forEach((link) => {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      window.scrollTo({
        top: 0,
        behavior: prefersReducedMotion ? 'auto' : 'smooth',
      });
    });
  });
}

const revealTargets = document.querySelectorAll('.reveal');

if ('IntersectionObserver' in window && revealTargets.length > 0) {
  const observer = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }

        entry.target.classList.add('is-visible');
        obs.unobserve(entry.target);
      });
    },
    { threshold: 0.2 }
  );

  revealTargets.forEach((target) => observer.observe(target));
} else {
  revealTargets.forEach((target) => target.classList.add('is-visible'));
}

const year = document.getElementById('year');
if (year) {
  year.textContent = String(new Date().getFullYear());
}

const reviewsList = document.getElementById('reviews-list');
const reviewsSummary = document.getElementById('reviews-summary');
const reviewsRating = document.getElementById('reviews-rating');
const reviewsCount = document.getElementById('reviews-count');
const reviewsNote = document.getElementById('reviews-note');
const googleReviewsLink = document.getElementById('google-reviews-link');

const reviewApiUrl = document.body?.dataset?.googleReviewsApi || '/api/google-reviews';
const reviewSearchUrl =
  document.body?.dataset?.googleReviewsLink ||
  'https://www.google.com/search?q=Nam%C3%ADbia+Oliveira+psic%C3%B3loga+avalia%C3%A7%C3%B5es';

if (googleReviewsLink) {
  googleReviewsLink.href = reviewSearchUrl;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function toStars(value) {
  const rating = Math.max(0, Math.min(5, Math.round(Number(value) || 0)));
  return `${'★'.repeat(rating)}${'☆'.repeat(5 - rating)}`;
}

function truncate(value, max = 340) {
  const text = String(value || '').trim();
  if (text.length <= max) {
    return text;
  }
  return `${text.slice(0, max - 1).trim()}…`;
}

function getReviewText(review) {
  if (!review) {
    return '';
  }
  if (typeof review.text === 'string') {
    return review.text;
  }
  return review.text?.text || '';
}

function toTimestamp(value) {
  const timestamp = Date.parse(value || '');
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function renderReviewCards(reviews, options = {}) {
  if (!reviewsList) {
    return;
  }

  const targetCount = Math.max(1, Number(options.requestedReviewCount || 1));

  if (!Array.isArray(reviews) || reviews.length === 0) {
    reviewsList.innerHTML = `
      <article class="review-card">
        <p class="review-text">Ainda não há avaliações públicas disponíveis via API para exibir nesta seção.</p>
      </article>
    `;
    return;
  }

  const cards = [...reviews]
    .sort((a, b) => toTimestamp(b.publishTime) - toTimestamp(a.publishTime))
    .slice(0, targetCount)
    .map((review) => {
      const authorName = escapeHtml(review.authorName || review.authorAttribution?.displayName || 'Paciente');
      const authorUri = review.authorUri || review.authorAttribution?.uri || '';
      const reviewUri = review.googleMapsUri || '';
      const reportUri = review.flagContentUri || '';
      const reviewText = escapeHtml(truncate(getReviewText(review)));
      const relativeTime = escapeHtml(
        review.relativePublishTimeDescription || review.relativeTimeDescription || 'Publicado no Google'
      );
      const stars = toStars(review.rating);
      const ratingLabel = Number(review.rating || 0).toFixed(1);

      return `
        <article class="review-card">
          <div class="review-head">
            <p class="review-author">${authorName}</p>
            <span class="review-stars" aria-label="Nota ${ratingLabel} de 5">${stars}</span>
          </div>
          <p class="review-date">${relativeTime}</p>
          <p class="review-text">${reviewText || 'Avaliação sem comentário escrito.'}</p>
          <div class="review-links">
            ${
              authorUri
                ? `<a class="review-link" href="${escapeHtml(authorUri)}" target="_blank" rel="noopener noreferrer">Perfil no Google</a>`
                : ''
            }
            ${
              reviewUri
                ? `<a class="review-link" href="${escapeHtml(reviewUri)}" target="_blank" rel="noopener noreferrer">Abrir avaliação</a>`
                : ''
            }
            ${
              reportUri
                ? `<a class="review-link" href="${escapeHtml(reportUri)}" target="_blank" rel="noopener noreferrer">Reportar conteúdo</a>`
                : ''
            }
          </div>
        </article>
      `;
    })
    .join('');

  reviewsList.innerHTML = cards;
}

async function loadGoogleReviews() {
  if (!reviewsList) {
    return;
  }

  try {
    const response = await fetch(reviewApiUrl, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`Resposta inválida (${response.status})`);
    }

    const payload = await response.json();
    const placeName = payload.placeName || 'Google';
    const rating = Number(payload.rating || 0);
    const total = Number(payload.userRatingCount || 0);

    if (reviewsSummary && reviewsRating && reviewsCount && Number.isFinite(rating) && total > 0) {
      reviewsSummary.hidden = false;
      reviewsRating.textContent = `${rating.toFixed(1)} / 5`;
      reviewsCount.textContent = `${total} avaliações`;
    }

    if (googleReviewsLink && payload.googleMapsUri) {
      googleReviewsLink.href = payload.googleMapsUri;
    }

    const requestedCount = Math.max(1, Number(payload.requestedReviewCount || 1));
    const returnedCount = Math.max(0, Number(payload.reviewsReturnedFromGoogle || 0));

    if (reviewsNote) {
      reviewsNote.textContent =
        returnedCount >= requestedCount
          ? `Mostrando ${requestedCount} avaliações mais recentes do perfil ${placeName} no Google.`
          : `Mostrando ${returnedCount} avaliações mais recentes disponíveis via API do Google para o perfil ${placeName}.`;
    }

    renderReviewCards(payload.reviews || [], {
      requestedReviewCount: requestedCount,
    });
  } catch (error) {
    reviewsList.innerHTML = `
      <article class="review-card">
        <p class="review-text">Não foi possível carregar as avaliações agora. Use o botão abaixo para ver direto no Google.</p>
      </article>
    `;

    if (reviewsNote) {
      reviewsNote.textContent = 'Integração temporariamente indisponível. Verifique a configuração da API do Google Places.';
    }
  }
}

void loadGoogleReviews();
