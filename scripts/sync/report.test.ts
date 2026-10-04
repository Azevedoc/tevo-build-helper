import type { Dataset, Item } from '../../src/data/types'
import { diffDatasets, staleIcons, unknownBuildItems } from './report'

const it = (id: string, over: Partial<Item> = {}): Item => ({ id, name: id, rarity: 'common', sources: [], ...over })
const ds = (version: string, items: Item[]): Dataset => ({ mapVersion: version, updatedAt: 'x', seededFrom: 'x', items })

test('lists added, removed and changed items between two datasets', () => {
  const prev = ds('7.39b', [it('a'), it('b'), it('c', { description: 'old' })])
  const next = ds('7.40', [it('a'), it('c', { description: 'new' }), it('d')])
  expect(diffDatasets(prev, next)).toEqual({ from: '7.39b', to: '7.40', added: ['d'], removed: ['b'], changed: ['c'] })
})

test('finds wiki build items that are not in the dataset', () => {
  const wiki = { classes: { Sniper: { 'Imp 1': ['a', 'gone'] }, Mystic: { 'Imp 2': ['gone', 'b'] } } }
  expect(unknownBuildItems(wiki, new Set(['a', 'b']))).toEqual(['Mystic Imp 2: gone', 'Sniper Imp 1: gone'])
})

test('finds icon files no item uses any more', () => {
  expect(staleIcons(['a.png', 'b.png', 'c.png'], ['a.png', 'c.png'])).toEqual(['b.png'])
})
