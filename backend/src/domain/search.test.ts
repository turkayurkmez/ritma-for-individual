import { test } from 'node:test';
import assert from 'node:assert/strict';
import { foldForSearch } from './search.js';

test('foldForSearch treats I, ı, İ and i as the same letter', () => {
  const folded = ['ILGAZ', 'ılgaz', 'İlgaz', 'ilgaz'].map(foldForSearch);
  assert.equal(new Set(folded).size, 1);
});

test('foldForSearch removes Turkish diacritics', () => {
  assert.equal(foldForSearch('Şener Çağlar Öztürk'), 'sener caglar ozturk');
});
