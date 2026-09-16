const isLocal = ['localhost', '127.0.0.1'].includes(window.location.hostname);

export const API_URL = isLocal ? 'http://localhost:8787' : 'https://boxdroll.boxdroll.workers.dev';
