import { API_URL } from './config.js';

export class ApiError extends Error {
  constructor(code) {
    super(code);
    this.code = code;
  }
}

export async function fetchList(listUrl) {
  let response;
  try {
    response = await fetch(`${API_URL}/list?url=${encodeURIComponent(listUrl)}`);
  } catch {
    throw new ApiError('network');
  }

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ApiError(body.error ?? 'unknown');
  }
  return body;
}

export async function fetchPosterUrl(slug) {
  const response = await fetch(`${API_URL}/poster?film=${encodeURIComponent(slug)}`);
  if (!response.ok) {
    return null;
  }
  const { url } = await response.json();
  return url;
}
