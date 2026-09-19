import { describe, expect, it } from 'vitest';
import { taglines } from '../js/taglines.js';

describe('taglines', () => {
  it('keeps both languages aligned', () => {
    expect(taglines.es).toHaveLength(taglines.en.length);
  });

  it('has no empty or duplicated lines', () => {
    for (const lines of Object.values(taglines)) {
      expect(lines.every((line) => line.trim())).toBe(true);
      expect(new Set(lines).size).toBe(lines.length);
    }
  });
});
