const isLocal = ['localhost', '127.0.0.1'].includes(window.location.hostname);

export const API_URL = isLocal
  ? 'http://localhost:8787'
  : 'https://boxdroll.YOUR-SUBDOMAIN.workers.dev';

export const SUPPORT_LINKS = {
  en: { label: 'ko-fi', url: 'https://ko-fi.com/YOUR-USERNAME' },
  es: { label: 'cafecito', url: 'https://cafecito.app/YOUR-USERNAME' },
};
