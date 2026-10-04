import { buildIndex, normalizeName } from './dataset'

test('normalizeName treats case, spacing and apostrophe variants as equal', () => {
  expect(normalizeName('  Death´s   Realm ')).toBe(normalizeName("death's realm"))
  expect(normalizeName('A’B‘C`D´E')).toBe("a'b'c'd'e")
})

test('buildIndex maps normalized names and aliases to ids', () => {
  const index = buildIndex({
    mapVersion: '7.39b', updatedAt: '2026-10-04', seededFrom: 'x',
    items: [{ id: 'ruby', name: 'Ruby', rarity: 'common', sources: [], aliases: ['Old Ruby'] }],
  })
  expect(index.byName.get('ruby')).toBe('ruby')
  expect(index.byName.get('old ruby')).toBe('ruby')
  expect(index.items.get('ruby')?.name).toBe('Ruby')
  expect(index.meta.mapVersion).toBe('7.39b')
})
