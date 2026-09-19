import confetti from '../vendor/canvas-confetti.mjs';
import { fetchList, fetchPosterUrl } from './api.js';
import { getLanguage, languages, setLanguage, t, translatePage } from './i18n.js';
import { parseUsername, watchlistUrl } from './letterboxd.js';
import { loadImage, revealPoster } from './poster.js';
import { pickRandom } from './random.js';
import { buildReel, labelFilms, spin } from './reel.js';
import * as sound from './sound.js';

const SPIN_DURATION = 3500;
const LETTERBOXD_COLORS = ['#ff8000', '#00e054', '#40bcf4'];

const form = document.querySelector('#roll-form');
const input = document.querySelector('#list-url');
const inputLabel = document.querySelector('#input-label');
const modeToggle = document.querySelector('#mode-toggle');
const status = document.querySelector('#status');
const machine = document.querySelector('#machine');
const reel = document.querySelector('#reel');
const result = document.querySelector('#result');
const resultTitle = document.querySelector('#result-title');
const resultYear = document.querySelector('#result-year');
const resultList = document.querySelector('#result-list');
const resultLink = document.querySelector('#result-link');
const poster = document.querySelector('#poster');
const posterCanvas = document.querySelector('#poster-canvas');
const rerollButton = document.querySelector('#reroll');
const languageToggle = document.querySelector('#lang-toggle');
const soundToggle = document.querySelector('#sound-toggle');

let list = null;
let mode = 'list';
let loadedUrl = '';
let isBusy = false;
let posterReveal = new AbortController();

function setBusy(busy) {
  isBusy = busy;
  document.body.classList.toggle('is-busy', busy);
  for (const control of [...form.elements, modeToggle, rerollButton]) {
    control.disabled = busy;
  }
}

function setStatus(key, { loading = false } = {}) {
  if (key) {
    status.dataset.i18n = key;
    status.textContent = t(key);
  } else {
    delete status.dataset.i18n;
    status.textContent = '';
  }
  status.classList.toggle('is-loading', loading);
}

function showResult(film) {
  resultTitle.textContent = film.title;
  resultYear.textContent = film.year ? `${film.year} ·` : '';
  resultList.textContent = list.name;
  resultLink.href = film.url;
  result.hidden = false;
}

async function loadPoster(film) {
  try {
    const url = film.slug && (await fetchPosterUrl(film.slug));
    return url ? await loadImage(url) : null;
  } catch {
    return null;
  }
}

async function showPoster(film, imagePromise) {
  const { signal } = posterReveal;

  poster.href = film.url;
  poster.hidden = false;
  poster.classList.add('is-loading');

  const image = await imagePromise;
  if (signal.aborted) {
    return;
  }

  if (!image) {
    poster.hidden = true;
    return;
  }

  await Promise.all(result.getAnimations().map((animation) => animation.finished)).catch(() => {});
  if (signal.aborted) {
    return;
  }

  poster.classList.remove('is-loading');
  await revealPoster(posterCanvas, image, { signal, onStep: sound.reveal });
}

function celebrate() {
  sound.win();
  const { top, height } = machine.getBoundingClientRect();
  confetti({
    particleCount: 60,
    spread: 80,
    startVelocity: 35,
    ticks: 120,
    origin: { y: (top + height / 2) / window.innerHeight },
    colors: LETTERBOXD_COLORS,
    shapes: ['square'],
    scalar: 0.9,
    flat: true,
  });
}

async function roll() {
  const winner = pickRandom(list.films);
  const posterImage = loadPoster(winner);

  posterReveal.abort();
  posterReveal = new AbortController();
  posterCanvas.getContext('2d').clearRect(0, 0, posterCanvas.width, posterCanvas.height);

  result.hidden = true;
  machine.hidden = false;
  machine.classList.remove('is-winner');
  document.body.classList.add('is-rolling');
  machine.scrollIntoView({ block: 'center', behavior: 'smooth' });

  await spin(reel, buildReel(list.films, winner), SPIN_DURATION, sound.tick);

  document.body.classList.remove('is-rolling');
  machine.classList.add('is-winner');
  showResult(winner);
  showPoster(winner, posterImage);
  result.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  celebrate();
}

function flagInput(key) {
  sound.error();
  setStatus(key);
  input.classList.add('is-invalid');
  input.animate(
    [{ translate: '0' }, { translate: '-6px' }, { translate: '6px' }, { translate: '0' }],
    {
      duration: 240,
      easing: 'steps(4)',
    },
  );
  input.focus();
}

function showError(code) {
  const key = t(`error.${code}`) ? modeKey(`error.${code}`) : 'error.unknown';
  if (code === 'invalid_url') {
    flagInput(key);
  } else {
    sound.error();
    setStatus(key);
  }
}

function clearInputError() {
  if (input.classList.contains('is-invalid')) {
    input.classList.remove('is-invalid');
    setStatus(null);
  }
}

async function handleSubmit(event) {
  event.preventDefault();
  if (isBusy) {
    return;
  }

  const typed = input.value.trim();
  if (!typed) {
    flagInput(isWatchlist() ? 'error.missing_username' : 'error.missing_url');
    return;
  }

  let listUrl = typed;
  if (isWatchlist()) {
    const username = parseUsername(typed);
    if (!username) {
      flagInput('error.invalid_username');
      return;
    }
    listUrl = watchlistUrl(username);
  }

  setBusy(true);
  sound.lever();

  try {
    if (listUrl !== loadedUrl) {
      setStatus(modeKey('loading'), { loading: true });
      const data = await fetchList(listUrl);
      list = { ...data, films: labelFilms(data.films) };
      loadedUrl = listUrl;
    }
    setStatus(null);
    await roll();
    setBusy(false);
  } catch (error) {
    loadedUrl = '';
    machine.hidden = true;
    result.hidden = true;
    setBusy(false);
    showError(error.code);
  }
}

async function handleReroll() {
  setBusy(true);
  sound.lever();
  await roll();
  setBusy(false);
}

function isWatchlist() {
  return mode === 'watchlist';
}

// Watchlist copy only overrides the list wording where the two differ.
function modeKey(key) {
  const watchlistKey = `${key}.watchlist`;
  return isWatchlist() && t(watchlistKey) ? watchlistKey : key;
}

// The input keeps its own label, placeholder and copy per mode; i18n does the wording.
function renderMode() {
  inputLabel.dataset.i18n = isWatchlist() ? 'usernameLabel' : 'inputLabel';
  input.dataset.i18nPlaceholder = isWatchlist() ? 'usernamePlaceholder' : 'listPlaceholder';
  input.inputMode = isWatchlist() ? 'text' : 'url';
  modeToggle.dataset.i18n = isWatchlist() ? 'switchToList' : 'switchToWatchlist';
  translatePage();
}

function toggleMode() {
  sound.blip();
  mode = isWatchlist() ? 'list' : 'watchlist';
  input.value = '';
  input.classList.remove('is-invalid');
  setStatus(null);
  renderMode();
  input.focus();
}

function getNextLanguage() {
  return languages[(languages.indexOf(getLanguage()) + 1) % languages.length];
}

function renderLanguage() {
  const nextLanguage = getNextLanguage();

  translatePage();
  for (const option of languageToggle.children) {
    option.classList.toggle('is-active', option.dataset.lang === getLanguage());
  }
  languageToggle.setAttribute(
    'aria-label',
    nextLanguage === 'es' ? 'Cambiar a español' : 'Switch to English',
  );
  soundToggle.setAttribute('aria-label', t('sound'));
}

function renderSound() {
  soundToggle.setAttribute('aria-pressed', String(sound.isSoundOn()));
}

form.addEventListener('submit', handleSubmit);
input.addEventListener('input', clearInputError);
rerollButton.addEventListener('click', handleReroll);
modeToggle.addEventListener('click', toggleMode);
languageToggle.addEventListener('click', () => {
  sound.blip();
  setLanguage(getNextLanguage());
  renderLanguage();
});
soundToggle.addEventListener('click', () => {
  sound.setSoundOn(!sound.isSoundOn());
  sound.blip();
  renderSound();
});

renderMode();
renderLanguage();
renderSound();
