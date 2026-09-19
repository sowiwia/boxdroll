const USERNAME = /^[\w-]+$/;

// People type a handle, paste @handle, or paste the whole url of their profile.
export function parseUsername(input) {
  const cleaned = input
    .trim()
    .replace(/^@/, '')
    .replace(/^https?:\/\//i, '')
    .replace(/^(www\.)?letterboxd\.com\//i, '');
  const [name = ''] = cleaned.split('/');

  return USERNAME.test(name) ? name.toLowerCase() : null;
}

export function watchlistUrl(username) {
  return `https://letterboxd.com/${username}/watchlist/`;
}
