import { buildIndex } from '../../data/dataset'
import { itemSources, searchItems } from './search'

const index = buildIndex({
  mapVersion: '', updatedAt: '', seededFrom: '',
  items: [
    { id: 'blood-ruby', name: 'Blood Ruby', rarity: 'rare', sources: [] },
    { id: 'ruby', name: 'Ruby', rarity: 'common', sources: [] },
    { id: 'gem', name: 'Gem', rarity: 'common', sources: [], aliases: ['Carbuncle'] },
    { id: 'diamond', name: 'Diamond', rarity: 'common', sources: [] },
  ],
})

test('prefix matches rank before substring matches', () => {
  expect(searchItems(index, 'ru').map(i => i.id)).toEqual(['ruby', 'blood-ruby'])
})

test('aliases are searched', () => {
  expect(searchItems(index, 'carb').map(i => i.id)).toEqual(['gem'])
})

test('empty query returns nothing', () => {
  expect(searchItems(index, '  ')).toEqual([])
})

test('limit caps the results', () => {
  expect(searchItems(index, 'r', 1)).toHaveLength(1)
})

test('sources group items, dungeon tiers first then the rest by name', () => {
  const idx = buildIndex({
    mapVersion: '', updatedAt: '', seededFrom: '',
    items: [
      { id: 'sigil', name: 'Sigil', rarity: 'mythic', sources: [{ where: 'Chiral Valley', tier: 'M2' }] },
      { id: 'feather', name: 'Feather', rarity: 'godly', sources: [{ where: 'Cursed Heaven', tier: 'M1' }] },
      { id: 'angel', name: 'Angel', rarity: 'godly', sources: [{ where: 'Cursed Heaven', tier: 'M1' }] },
      { id: 'boots', name: 'Boots', rarity: 'godly', sources: [{ where: 'Cursed Heaven' }] },
      { id: 'orb', name: 'Orb', rarity: 'legendary', sources: [{ where: 'Oblivion', tier: 'h1' }] },
      { id: 'ring', name: 'Ring', rarity: 'mythic', sources: [{ where: 'Champion Of Chaos' }] },
      { id: 'skull', name: 'Skull', rarity: 'mythic', sources: [{ where: 'Skew', tier: '9999999 Gold, 1000 Shards' }] },
      { id: 'loose', name: 'Loose', rarity: 'common', sources: [] },
    ],
  })
  expect(itemSources(idx).map(s => [s.label, s.items.map(i => i.id)])).toEqual([
    ['H1 · Oblivion', ['orb']],
    ['M1 · Cursed Heaven', ['angel', 'boots', 'feather']],
    ['M2 · Chiral Valley', ['sigil']],
    ['Champion Of Chaos', ['ring']],
    ['Skew', ['skull']],
  ])
})
