import { describe, it, expect } from 'vitest';
import { createId } from '../utils';

describe('createId', () => {
  it('returns a 24-character string', () => {
    const id = createId();
    expect(id).toHaveLength(24);
  });

  it('returns only hex characters', () => {
    const id = createId();
    expect(id).toMatch(/^[0-9a-f]{24}$/);
  });

  it('generates unique IDs', () => {
    const ids = new Set(Array.from({ length: 100 }, () => createId()));
    expect(ids.size).toBe(100);
  });
});
