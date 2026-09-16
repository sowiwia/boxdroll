import { describe, expect, it } from 'vitest';
import { buildReel, labelFilms } from '../js/reel.js';

const makeFilms = (count) => Array.from({ length: count }, (_, i) => ({ title: `Film ${i}` }));

describe('buildReel', () => {
  it('never repeats a film when the list is long enough', () => {
    const films = makeFilms(500);
    const { items, winnerIndex } = buildReel(films, films[42]);

    expect(items[winnerIndex]).toBe(films[42]);
    expect(new Set(items).size).toBe(items.length);
  });

  it('shows the winner only once', () => {
    const films = makeFilms(10);
    const { items } = buildReel(films, films[3]);

    expect(items.filter((film) => film === films[3])).toHaveLength(1);
  });

  it('never shows the same film twice in a row on short lists', () => {
    const films = makeFilms(3);
    const { items } = buildReel(films, films[0]);

    items.slice(1).forEach((film, i) => expect(film).not.toBe(items[i]));
  });

  it('works with a single film', () => {
    const films = makeFilms(1);
    const { items, winnerIndex } = buildReel(films, films[0]);

    expect(items[winnerIndex]).toBe(films[0]);
  });
});

describe('labelFilms', () => {
  it('adds the year only to titles shared by several films', () => {
    const films = labelFilms([
      { title: 'Suspiria', year: 1977 },
      { title: 'Suspiria', year: 2018 },
      { title: 'Hereditary', year: 2018 },
    ]);

    expect(films.map((film) => film.label)).toEqual([
      'Suspiria (1977)',
      'Suspiria (2018)',
      'Hereditary',
    ]);
  });
});
