import type { Item } from '../data/types'
import { dataset } from '../data/dataset'
import { planBuild, UNKNOWN_SOURCE, type PlanInput } from './plan'

const base = (id: string, name: string, sources: Item['sources'] = []): Item => ({ id, name, rarity: 'common', sources })
const craft = (id: string, name: string, recipe: [string, number][]): Item =>
  ({ id, name, rarity: 'forged', sources: [], recipe: recipe.map(([item, qty]) => ({ item, qty })) })

const ITEMS = new Map<string, Item>([
  ['ruby', base('ruby', 'Ruby', [{ where: 'Shop' }, { where: 'Agahnim', tier: 'H2' }])],
  ['diamond', base('diamond', 'Diamond')],
  ['diabolic-orb', base('diabolic-orb', 'Diabolic Orb', [{ where: 'Demon of Fire', tier: 'H1' }])],
  ['hell-diamond', craft('hell-diamond', 'Hell Diamond', [['ruby', 1], ['diabolic-orb', 2]])],
  ['glow-orb', craft('glow-orb', 'Glow Orb', [['hell-diamond', 1], ['diamond', 1], ['ruby', 1]])],
  ['blade', craft('blade', 'Blade', [['hell-diamond', 1], ['diabolic-orb', 1]])],
])

const run = (goals: string[], owned: Record<string, number> = {}) =>
  planBuild({ items: ITEMS, owned: new Map(Object.entries(owned)), goals } satisfies PlanInput)
const row = (r: ReturnType<typeof run>, id: string) => r.materials.find(m => m.itemId === id)

test('nothing owned: goal not started, totals and breakdown by parent', () => {
  const r = run(['glow-orb'])
  expect(r.goals[0]).toMatchObject({ goalId: 'glow-orb', status: 'not-started', progress: 0, totalUnits: 5, coveredUnits: 0 })
  expect(row(r, 'diabolic-orb')).toMatchObject({ isBase: true, need: 2, own: 0, missing: 2 })
  expect(row(r, 'diabolic-orb')?.breakdown).toEqual([{ parentId: 'hell-diamond', goalId: 'glow-orb', count: 2 }])
  expect(row(r, 'glow-orb')?.breakdown).toEqual([{ parentId: null, goalId: 'glow-orb', count: 1 }])
  expect(row(r, 'ruby')).toMatchObject({ need: 2, missing: 2 })
})

test('owned intermediate cuts its subtree and counts its leaf units as covered', () => {
  const r = run(['glow-orb'], { 'hell-diamond': 1 })
  expect(row(r, 'diabolic-orb')).toBeUndefined()
  expect(row(r, 'hell-diamond')).toMatchObject({ isBase: false, need: 1, own: 1, missing: 0 })
  expect(r.goals[0]).toMatchObject({ status: 'in-progress', coveredUnits: 3, totalUnits: 5, progress: 0.6 })
})

test('owned goal is done and its parts are not counted', () => {
  const r = run(['glow-orb'], { 'glow-orb': 1 })
  expect(r.goals[0]).toMatchObject({ status: 'done', progress: 1 })
  expect(row(r, 'ruby')).toBeUndefined()
})

test('shared pool across goals with breakdown per parent and goal', () => {
  const r = run(['glow-orb', 'blade'], { 'diabolic-orb': 3 })
  expect(row(r, 'diabolic-orb')).toMatchObject({ need: 5, own: 3, missing: 2 })
  expect(row(r, 'diabolic-orb')?.breakdown).toEqual(expect.arrayContaining([
    { parentId: 'hell-diamond', goalId: 'glow-orb', count: 2 },
    { parentId: 'hell-diamond', goalId: 'blade', count: 2 },
    { parentId: 'blade', goalId: 'blade', count: 1 },
  ]))
  expect(r.goals[0].coveredUnits).toBe(2) // glow-orb consumed its 2 orbs first
  expect(r.goals[1].coveredUnits).toBe(1)
})

test('the same goal twice is planned twice', () => {
  const r = run(['glow-orb', 'glow-orb'])
  expect(r.goals).toHaveLength(2)
  expect(row(r, 'ruby')?.need).toBe(4)
})

test('goal ids missing from the dataset are reported and skipped', () => {
  const r = run(['removed-item'])
  expect(r.unknownGoals).toEqual(['removed-item'])
  expect(r.goals).toEqual([])
  expect(r.materials).toEqual([])
})

test('materials sorted by missing desc then name', () => {
  const r = run(['glow-orb'], { diamond: 1 })
  expect(r.materials.map(m => m.itemId)).toEqual(['diabolic-orb', 'ruby', 'glow-orb', 'hell-diamond', 'diamond'])
})

test('bySource lists missing base materials under every source, unknown last', () => {
  const r = run(['glow-orb'])
  expect(r.bySource).toEqual([
    { where: 'Agahnim', tier: 'H2', items: [{ itemId: 'ruby', missing: 2 }] },
    { where: 'Demon of Fire', tier: 'H1', items: [{ itemId: 'diabolic-orb', missing: 2 }] },
    { where: 'Shop', items: [{ itemId: 'ruby', missing: 2 }] },
    { where: UNKNOWN_SOURCE, items: [{ itemId: 'diamond', missing: 1 }] },
  ])
})

test('real dataset: Hyperion plan', () => {
  const r = planBuild({ items: dataset.items, owned: new Map(), goals: ['hyperion'] })
  expect(r.goals[0].totalUnits).toBeGreaterThan(0)
  expect(r).toMatchSnapshot()
})
