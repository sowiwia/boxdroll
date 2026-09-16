const REEL_LENGTH = 40;

const easeOutCubic = (progress) => 1 - (1 - progress) ** 3;

export function pickRandom(items) {
  return items[Math.floor(Math.random() * items.length)];
}

export function buildReel(films, winner) {
  const fillers = Array.from({ length: REEL_LENGTH }, () => pickRandom(films));
  return { items: [...fillers, winner, pickRandom(films)], winnerIndex: REEL_LENGTH };
}

export function spin(reelElement, { items, winnerIndex }, duration) {
  reelElement.replaceChildren(
    ...items.map((film, index) => {
      const item = document.createElement('li');
      item.textContent = film.title;
      item.classList.toggle('is-winner', index === winnerIndex);
      return item;
    }),
  );

  const moveTo = (index) => {
    reelElement.style.setProperty('--index', index);
  };

  if (duration === 0) {
    moveTo(winnerIndex);
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const start = performance.now();

    function frame(now) {
      const progress = Math.min((now - start) / duration, 1);
      moveTo(Math.round(easeOutCubic(progress) * winnerIndex));

      if (progress < 1) {
        requestAnimationFrame(frame);
      } else {
        resolve();
      }
    }

    requestAnimationFrame(frame);
  });
}
