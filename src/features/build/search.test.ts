import { buildIndex } from '../../data/dataset'
import { goalFilter, searchItems } from './search'

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

test('goal items are current Imp/M dungeon drops and items sold by the listed NPCs', () => {
  const idx = buildIndex({
    mapVersion: '', updatedAt: '', seededFrom: '',
    items: [
      { id: 'sword', name: 'Master Sword', rarity: 'godly', sources: [{ where: 'Cursed Heaven', tier: 'M1' }] },
      { id: 'tome', name: 'Tome', rarity: 'legendary', sources: [{ where: 'City of Illusions', tier: 'Imp 1' }] },
      { id: 'untiered', name: 'Untiered', rarity: 'godly', sources: [{ where: 'Cursed Heaven' }] },
      { id: 'orb', name: 'Glow Orb', rarity: 'godly', sources: [{ where: 'Angel of Clouds' }] },
      { id: 'bob', name: 'Bob Item', rarity: 'godly', sources: [{ where: 'Bob the Builder' }] },
      { id: 'wiz', name: 'Wizard Item', rarity: 'godly', sources: [{ where: 'Magic Wizard' }] },
      { id: 'wm', name: 'Runic Bow', rarity: 'godly', sources: [{ where: 'Weapons Master' }] },
      { id: 'soul', name: 'Soul Item', rarity: 'godly', sources: [{ where: 'Ancient Soul' }] },
      { id: 'h1', name: 'Hell Drop', rarity: 'epic', sources: [{ where: 'Oblivion', tier: 'H1' }] },
      { id: 'coc', name: 'Vespermoon', rarity: 'mythic', sources: [{ where: 'Champion Of Chaos' }] },
      { id: 'npc', name: 'Ring', rarity: 'mythic', sources: [{ where: 'Blacksmith' }] },
      { id: 'old', name: 'Old', rarity: 'godly', legacy: true, sources: [{ where: 'Angel of Sun' }] },
      { id: 'removed', name: '[Removed] BD', rarity: 'common', sources: [{ where: 'Angel of Sun' }] },
    ],
  })
  const isGoal = goalFilter(idx)
  expect([...idx.items.values()].filter(isGoal).map(i => i.id)).toEqual(['sword', 'tome', 'untiered', 'orb', 'bob', 'wiz', 'wm', 'soul', 'coc'])
  expect(searchItems(idx, 'r', 20, isGoal).map(i => i.id)).toEqual(['wm', 'orb', 'sword', 'untiered', 'coc', 'wiz'])
})
