import confetti from 'https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.4/+esm';
import { fetchList } from './api.js';
import { getLanguage, languages, setLanguage, t, translatePage } from './i18n.js';
import { buildReel, pickRandom, spin } from './reel.js';

const SPIN_DURATION = 3500;
const LETTERBOXD_COLORS = ['#ff8000', '#00e054', '#40bcf4'];

const form = document.querySelector('#roll-form');
const input = document.querySelector('#list-url');
const status = document.querySelector('#status');
const machine = document.querySelector('#machine');
const reel = document.querySelector('#reel');
const result = document.querySelector('#result');
const resultTitle = document.querySelector('#result-title');
const resultYear = document.querySelector('#result-year');
const resultList = document.querySelector('#result-list');
const resultLink = document.querySelector('#result-link');
const rerollButton = document.querySelector('#reroll');
const languageToggle = document.querySelector('#lang-toggle');

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

let list = null;
let loadedUrl = '';
let isBusy = false;

function setBusy(busy) {
  isBusy = busy;
  document.body.classList.toggle('is-busy', busy);
  for (const control of [...form.elements, rerollButton]) {
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

function celebrate() {
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
    disableForReducedMotion: true,
  });
}

async function roll() {
  const winner = pickRandom(list.films);
  const scrollBehavior = reducedMotion.matches ? 'auto' : 'smooth';

  result.hidden = true;
  machine.hidden = false;
  machine.classList.remove('is-winner');
  document.body.classList.add('is-rolling');
  machine.scrollIntoView({ block: 'center', behavior: scrollBehavior });

  await spin(reel, buildReel(list.films, winner), reducedMotion.matches ? 0 : SPIN_DURATION);

  document.body.classList.remove('is-rolling');
  machine.classList.add('is-winner');
  showResult(winner);
  result.scrollIntoView({ block: 'nearest', behavior: scrollBehavior });
  celebrate();
}

async function handleSubmit(event) {
  event.preventDefault();
  if (isBusy) {
    return;
  }

  const listUrl = input.value.trim();
  setBusy(true);

  try {
    if (listUrl !== loadedUrl) {
      setStatus('loading', { loading: true });
      list = await fetchList(listUrl);
      loadedUrl = listUrl;
    }
    setStatus(null);
    await roll();
  } catch (error) {
    loadedUrl = '';
    machine.hidden = true;
    result.hidden = true;
    setStatus(t(`error.${error.code}`) ? `error.${error.code}` : 'error.unknown');
  } finally {
    setBusy(false);
  }
}

async function handleReroll() {
  setBusy(true);
  await roll();
  setBusy(false);
}

function getNextLanguage() {
  return languages[(languages.indexOf(getLanguage()) + 1) % languages.length];
}

function renderLanguage() {
  const nextLanguage = getNextLanguage();

  translatePage();
  languageToggle.textContent = nextLanguage;
  languageToggle.setAttribute(
    'aria-label',
    nextLanguage === 'es' ? 'Cambiar a español' : 'Switch to English',
  );
}

form.addEventListener('submit', handleSubmit);
rerollButton.addEventListener('click', handleReroll);
languageToggle.addEventListener('click', () => {
  setLanguage(getNextLanguage());
  renderLanguage();
});

renderLanguage();
