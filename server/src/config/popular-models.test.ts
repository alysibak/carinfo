import { describe, expect, it } from 'vitest';
import { getModelPages } from '../services/car.service.js';
import { POPULAR_MODEL_PAGES } from './popular-models.js';

describe('POPULAR_MODEL_PAGES', () => {
  it('links pages that exist, under their own names', () => {
    const pages = new Map(getModelPages().map((page) => [page.path, page.label]));
    for (const { label, path } of POPULAR_MODEL_PAGES) expect(pages.get(path), path).toBe(label);
  });
});
