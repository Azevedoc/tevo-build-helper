import { buildIndex } from '../../data/dataset'
import { searchItems } from './search'

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
