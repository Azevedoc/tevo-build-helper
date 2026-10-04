import type { Dataset, Item } from './types'
import { validateDataset } from './validate'

const ds = (items: Item[]): Dataset => ({ mapVersion: '7.39b', updatedAt: '2026-10-04', seededFrom: '', items })

const valid: Item[] = [
  { id: 'a', name: 'A', rarity: 'forged', sources: [], recipe: [{ item: 'b', qty: 2 }, { item: 'c', qty: 1 }] },
  { id: 'b', name: 'B', rarity: 'common', sources: [{ where: 'Shop' }] },
  { id: 'c', name: 'C', rarity: 'rare', sources: [] },
]

test('valid dataset has no errors', () => {
  expect(validateDataset(ds(valid))).toEqual([])
})

test('reports a recipe input that does not exist', () => {
  const items = [{ ...valid[0], recipe: [{ item: 'missing', qty: 1 }] }, valid[1], valid[2]]
  const errors = validateDataset(ds(items))
  expect(errors).toHaveLength(1)
  expect(errors[0]).toContain('missing')
})

test('reports recipe cycles', () => {
  const items: Item[] = [
    { id: 'a', name: 'A', rarity: 'common', sources: [], recipe: [{ item: 'b', qty: 1 }] },
    { id: 'b', name: 'B', rarity: 'common', sources: [], recipe: [{ item: 'a', qty: 1 }] },
  ]
  expect(validateDataset(ds(items)).some(e => e.includes('cycle'))).toBe(true)
})

test('reports duplicate ids', () => {
  const items = [...valid, { ...valid[2], name: 'C2' }]
  expect(validateDataset(ds(items)).some(e => e.includes('duplicate id'))).toBe(true)
})

test('reports a name that collides with another item alias, ignoring case', () => {
  const items = [...valid, { id: 'd', name: 'D', rarity: 'common' as const, sources: [], aliases: ['b'] }]
  expect(validateDataset(ds(items)).some(e => e.includes('duplicate name'))).toBe(true)
})

test('reports unknown rarity', () => {
  const items = [{ ...valid[1], rarity: 'shiny' as never }, valid[2], { ...valid[0], recipe: [] }]
  expect(validateDataset(ds(items)).some(e => e.includes('rarity'))).toBe(true)
})

test('reports non-positive and non-integer qty', () => {
  const zero = validateDataset(ds([{ ...valid[0], recipe: [{ item: 'b', qty: 0 }] }, valid[1], valid[2]]))
  const frac = validateDataset(ds([{ ...valid[0], recipe: [{ item: 'b', qty: 1.5 }] }, valid[1], valid[2]]))
  expect(zero.some(e => e.includes('qty'))).toBe(true)
  expect(frac.some(e => e.includes('qty'))).toBe(true)
})

test('reports missing icon files', () => {
  const items = [{ ...valid[1], icon: 'a.png' }, valid[2], valid[0]]
  const errors = validateDataset(ds(items), () => false)
  expect(errors.some(e => e.includes('a.png'))).toBe(true)
})
