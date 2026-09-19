import { shuffle } from './random.js';
import { taglines } from './taglines.js';

const STORAGE_KEY = 'boxdroll:language';
const TAGLINE_KEY = 'boxdroll:taglines';

// One splash line per page load, shared by both languages. It is dealt from a
// shuffled bag that outlives the page, so every line comes up once before any
// of them comes round again, which pure chance would not give us.
const taglineIndex = dealTagline();

function readBag() {
  try {
    const bag = JSON.parse(localStorage.getItem(TAGLINE_KEY));
    return {
      last: bag.last,
      queue: bag.queue.filter((index) => Number.isInteger(index) && index < taglines.en.length),
    };
  } catch {
    return { last: null, queue: [] };
  }
}

function saveBag(bag) {
  try {
    localStorage.setItem(TAGLINE_KEY, JSON.stringify(bag));
  } catch {
    // Storage is blocked in some private modes; the order just won't persist.
  }
}

function dealTagline() {
  const { last, queue } = readBag();

  if (!queue.length) {
    queue.push(...shuffle([...taglines.en.keys()]));
    // A refilled bag shouldn't open with the line the last one closed with.
    if (queue[0] === last && queue.length > 1) {
      [queue[0], queue[1]] = [queue[1], queue[0]];
    }
  }

  const index = queue.shift();
  saveBag({ last: index, queue });
  return index;
}

const messages = {
  en: {
    tagline: taglines.en[taglineIndex],
    inputLabel: 'Letterboxd list URL',
    usernameLabel: 'Letterboxd username',
    listPlaceholder: 'letterboxd.com/user/list/...',
    usernamePlaceholder: 'type your letterboxd username',
    switchToWatchlist: 'roll your watchlist?',
    switchToList: 'roll a letterboxd list?',
    roll: 'roll',
    reroll: 'reroll',
    loading: 'loading list',
    'loading.watchlist': 'loading watchlist',
    viewOnLetterboxd: 'view on letterboxd ↗',
    from: 'from',
    sound: 'sound',
    'error.missing_url': 'paste a letterboxd list first',
    'error.missing_username': 'type your letterboxd username first',
    'error.invalid_url': "that doesn't look like a letterboxd list url",
    'error.invalid_username': "that doesn't look like a letterboxd username",
    'error.not_found': "couldn't find that list. is it public?",
    'error.not_found.watchlist': "couldn't find that user. typo?",
    'error.empty': 'that list is empty',
    'error.empty.watchlist': 'that watchlist is empty or private',
    'error.upstream': "letterboxd isn't answering. try again in a bit",
    'error.network': "couldn't connect. check your internet",
    'error.rate_limited': 'too many rolls at once. wait a minute',
    'error.unknown': 'something went wrong. try again',
  },
  es: {
    tagline: taglines.es[taglineIndex],
    inputLabel: 'URL de la lista de Letterboxd',
    usernameLabel: 'Usuario de Letterboxd',
    listPlaceholder: 'letterboxd.com/user/list/...',
    usernamePlaceholder: 'escribe tu usuario de letterboxd',
    switchToWatchlist: '¿girar tu watchlist?',
    switchToList: '¿girar una lista de letterboxd?',
    roll: 'girar',
    reroll: 'otra',
    loading: 'cargando lista',
    'loading.watchlist': 'cargando watchlist',
    viewOnLetterboxd: 'ver en letterboxd ↗',
    from: 'de',
    sound: 'sonido',
    'error.missing_url': 'primero pega una lista de letterboxd',
    'error.missing_username': 'primero escribe tu usuario de letterboxd',
    'error.invalid_url': 'eso no parece una url de lista de letterboxd',
    'error.invalid_username': 'eso no parece un usuario de letterboxd',
    'error.not_found': 'no encontré esa lista. ¿es pública?',
    'error.not_found.watchlist': 'no encontré ese usuario. ¿lo escribiste bien?',
    'error.empty': 'esa lista está vacía',
    'error.empty.watchlist': 'esa watchlist está vacía o es privada',
    'error.upstream': 'letterboxd no responde. prueba en un rato',
    'error.network': 'no hay conexión. revisa tu internet',
    'error.rate_limited': 'demasiados giros seguidos. espera un minuto',
    'error.unknown': 'algo salió mal. prueba de nuevo',
  },
};

export const languages = Object.keys(messages);

let currentLanguage = detectLanguage();

function readSavedLanguage() {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function saveLanguage(language) {
  try {
    localStorage.setItem(STORAGE_KEY, language);
  } catch {
    // Storage is blocked in some private modes; the choice just won't persist.
  }
}

function detectLanguage() {
  const saved = readSavedLanguage();
  if (languages.includes(saved)) {
    return saved;
  }
  return navigator.language.startsWith('es') ? 'es' : 'en';
}

export function getLanguage() {
  return currentLanguage;
}

export function t(key) {
  return messages[currentLanguage][key];
}

export function setLanguage(language) {
  currentLanguage = language;
  saveLanguage(language);
  translatePage();
}

export function translatePage() {
  document.documentElement.lang = currentLanguage;
  for (const element of document.querySelectorAll('[data-i18n]')) {
    element.textContent = t(element.dataset.i18n);
  }
  for (const element of document.querySelectorAll('[data-i18n-placeholder]')) {
    element.placeholder = t(element.dataset.i18nPlaceholder);
  }
}
