import { genderLabel, GENDERS, statusLabel, STATUSES } from './labels';

test('labels all four genders', () => {
  expect(GENDERS).toEqual(['female', 'male', 'other', 'undisclosed']);
  expect(GENDERS.map(genderLabel)).toEqual(['Kadın', 'Erkek', 'Diğer', 'Belirtmek istemiyorum']);
});

test('labels all three statuses', () => {
  expect(STATUSES).toEqual(['scheduled', 'completed', 'cancelled']);
  expect(STATUSES.map(statusLabel)).toEqual(['Planlandı', 'Tamamlandı', 'İptal']);
});
