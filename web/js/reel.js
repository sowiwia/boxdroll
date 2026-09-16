import { shuffle } from './random.js';

const REEL_LENGTH = 40;

const easeOutCubic = (progress) => 1 - (1 - progress) ** 3;

export function labelFilms(films) {
  const titleCounts = new Map();
  for (const { title } of films) {
    titleCounts.set(title, (titleCounts.get(title) ?? 0) + 1);
  }

  return films.map((film) => ({
    ...film,
    label:
      titleCounts.get(film.title) > 1 && film.year ? `${film.title} (${film.year})` : film.title,
  }));
}

export function buildReel(films, winner, length = REEL_LENGTH) {
  const others = films.filter((film) => film !== winner);
  const pool = others.length > 0 ? shuffle(others) : [winner];
  const fillerAt = (index) => pool[index % pool.length];

  const fillers = Array.from({ length }, (_, index) => fillerAt(index));
  return { items: [...fillers, winner, fillerAt(length)], winnerIndex: length };
}

function createItem(title) {
  const item = document.createElement('li');
  item.textContent = title;
  return item;
}

export function spin(reelElement, { items, winnerIndex }, duration) {
  reelElement.replaceChildren(
    ...items.map((film, index) => {
      const item = createItem(film.label);
      item.classList.toggle('is-winner', index === winnerIndex);
      return item;
    }),
  );

  const moveTo = (index) => {
    reelElement.style.transform = `translateY(calc(${1 - index} * var(--row)))`;
  };
  moveTo(0);

  return new Promise((resolve) => {
    const start = performance.now();

    function frame(now) {
      const progress = Math.min((now - start) / duration, 1);
      moveTo(easeOutCubic(progress) * winnerIndex);

      if (progress < 1) {
        requestAnimationFrame(frame);
      } else {
        resolve();
      }
    }

    requestAnimationFrame(frame);
  });
}
