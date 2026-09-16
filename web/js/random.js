export function randomInt(max) {
  const limit = Math.floor(2 ** 32 / max) * max;
  const [value] = crypto.getRandomValues(new Uint32Array(1));
  return value < limit ? value % max : randomInt(max);
}

export function pickRandom(items) {
  return items[randomInt(items.length)];
}

export function shuffle(items) {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
