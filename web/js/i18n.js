const STORAGE_KEY = 'boxdroll:language';

const messages = {
  en: {
    tagline: 'paste a letterboxd list. let fate pick.',
    inputLabel: 'Letterboxd list URL',
    roll: 'roll',
    reroll: 'reroll',
    loading: 'loading list',
    viewOnLetterboxd: 'view on letterboxd ↗',
    from: 'from',
    'error.invalid_url': "that doesn't look like a letterboxd list url",
    'error.not_found': "couldn't find that list. is it public?",
    'error.empty': 'that list is empty',
    'error.upstream': "letterboxd isn't answering. try again in a bit",
    'error.network': "couldn't connect. check your internet",
    'error.unknown': 'something went wrong. try again',
  },
  es: {
    tagline: 'pega una lista de letterboxd. que decida el destino.',
    inputLabel: 'URL de la lista de Letterboxd',
    roll: 'tirar',
    reroll: 'otra',
    loading: 'cargando lista',
    viewOnLetterboxd: 'ver en letterboxd ↗',
    from: 'de',
    'error.invalid_url': 'eso no parece una url de lista de letterboxd',
    'error.not_found': 'no encontré esa lista. ¿es pública?',
    'error.empty': 'esa lista está vacía',
    'error.upstream': 'letterboxd no responde. prueba en un rato',
    'error.network': 'no hay conexión. revisa tu internet',
    'error.unknown': 'algo salió mal. prueba de nuevo',
  },
};

export const languages = Object.keys(messages);

let currentLanguage = detectLanguage();

function detectLanguage() {
  const saved = localStorage.getItem(STORAGE_KEY);
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
  localStorage.setItem(STORAGE_KEY, language);
  translatePage();
}

export function translatePage() {
  document.documentElement.lang = currentLanguage;
  for (const element of document.querySelectorAll('[data-i18n]')) {
    element.textContent = t(element.dataset.i18n);
  }
}
