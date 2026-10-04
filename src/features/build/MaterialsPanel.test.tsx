import { fireEvent, render, screen, within } from '@testing-library/react'
import type { Item } from '../../data/types'
import { UNKNOWN_SOURCE, type PlanResult } from '../../engine/plan'
import { MaterialsPanel } from './MaterialsPanel'

const item = (id: string, name: string, sources: Item['sources'] = [], recipe?: Item['recipe']): Item => ({ id, name, rarity: 'common', sources, recipe })
const items = new Map<string, Item>([
  ['diabolic-orb', item('diabolic-orb', 'Diabolic Orb', [{ where: 'Demon of Fire', tier: 'H1' }])],
  ['hell-diamond', item('hell-diamond', 'Hell Diamond', [], [{ item: 'ruby', qty: 1 }, { item: 'pre-fusion-1', qty: 1 }])],
  ['pre-fusion-1', item('pre-fusion-1', 'Pre-fusion 1', [], [{ item: 'diabolic-orb', qty: 2 }])],
  ['glow-orb', item('glow-orb', 'Glow Orb')],
  ['celestial-blade', item('celestial-blade', 'Celestial Blade')],
  ['ruby', item('ruby', 'Ruby', [{ where: 'Agahnim', tier: 'H2' }])],
  ['sapphire', item('sapphire', 'Sapphire', [{ where: 'Agahnim', tier: 'H2' }])],
  ['diamond', item('diamond', 'Diamond')],
])

const plan: PlanResult = {
  goals: [],
  unknownGoals: [],
  materials: [
    {
      itemId: 'diabolic-orb', isBase: true, need: 6, own: 3, missing: 3,
      breakdown: [
        { parentId: 'hell-diamond', goalId: 'glow-orb', count: 2 },
        { parentId: 'pre-fusion-1', goalId: 'celestial-blade', count: 4 },
      ],
    },
    { itemId: 'sapphire', isBase: true, need: 4, own: 0, missing: 4, breakdown: [{ parentId: 'glow-orb', goalId: 'glow-orb', count: 4 }] },
    { itemId: 'diamond', isBase: true, need: 1, own: 0, missing: 1, breakdown: [{ parentId: 'glow-orb', goalId: 'glow-orb', count: 1 }] },
    { itemId: 'pre-fusion-1', isBase: false, need: 2, own: 1, missing: 1, breakdown: [{ parentId: 'celestial-blade', goalId: 'celestial-blade', count: 2 }] },
    { itemId: 'glow-orb', isBase: false, need: 1, own: 0, missing: 1, breakdown: [{ parentId: null, goalId: 'glow-orb', count: 1 }] },
    { itemId: 'hell-diamond', isBase: false, need: 1, own: 1, missing: 0, breakdown: [{ parentId: 'glow-orb', goalId: 'glow-orb', count: 1 }] },
    { itemId: 'ruby', isBase: true, need: 2, own: 2, missing: 0, breakdown: [{ parentId: 'glow-orb', goalId: 'glow-orb', count: 2 }] },
  ],
  bySource: [
    { where: 'Agahnim', tier: 'H2', items: [{ itemId: 'sapphire', missing: 4 }] },
    { where: 'Oblivion', tier: 'H1', items: [{ itemId: 'diabolic-orb', missing: 3 }] },
    { where: UNKNOWN_SOURCE, items: [{ itemId: 'diamond', missing: 1 }] },
  ],
}

const owned = new Map([['diabolic-orb', 3], ['ruby', 4], ['hell-diamond', 1], ['pre-fusion-1', 1]])
const renderPanel = (p = plan) => render(<MaterialsPanel plan={p} items={items} owned={owned} />)
const openAlreadyHave = () => fireEvent.click(screen.getByRole('button', { name: /^Already have/ }))

test('one list grouped by source, each material showing owned out of needed', () => {
  renderPanel()
  expect(screen.queryByRole('tab')).not.toBeInTheDocument()
  const groups = screen.getAllByTestId('source-group')
  expect(groups.map(g => within(g).getAllByTestId('material-row').map(r => r.textContent))).toEqual([
    ['▸Sapphire0/4'],
    ['▸Diabolic Orb3/6'],
    ['▸Diamond0/1'],
  ])
  expect(groups[0]).toHaveTextContent('Agahnim · H2')
  expect(groups.at(-1)).toHaveTextContent(UNKNOWN_SOURCE)
  expect(within(groups[1]).getByText('3/6')).not.toHaveClass('text-emerald-400')
})

test('owned items the goals use sit in a collapsed "Already have" group at the bottom', () => {
  renderPanel()
  const toggle = screen.getByRole('button', { name: 'Already have · 3' })
  expect(toggle).toHaveAttribute('aria-expanded', 'false')
  const group = screen.getByTestId('already-have')
  expect(within(group).queryByTestId('material-row')).not.toBeInTheDocument()
  openAlreadyHave()
  expect(within(group).getAllByTestId('material-row').map(r => r.textContent)).toEqual([
    '▸Hell Diamond1/1',
    '▸Pre-fusion 11/2',
    '▸Ruby4/2',
  ])
  expect(within(group).getByText('4/2')).toHaveClass('text-emerald-400')
  expect(within(group).getByText('1/2')).not.toHaveClass('text-emerald-400')
})

test('no "Already have" group when nothing owned is used', () => {
  const nothingOwned = { ...plan, materials: plan.materials.map(m => ({ ...m, own: 0, missing: m.need })) }
  render(<MaterialsPanel plan={nothingOwned} items={items} owned={new Map()} />)
  expect(screen.queryByTestId('already-have')).not.toBeInTheDocument()
})

test('says nothing is left to farm, still listing what is owned', () => {
  renderPanel({ ...plan, bySource: [] })
  expect(screen.getByText('Nothing left to farm.')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Already have · 3' })).toBeInTheDocument()
})

test('a crafted item expands to show its recipe, nested', () => {
  renderPanel()
  openAlreadyHave()
  const hellDiamond = screen.getByRole('button', { name: 'Show materials for Hell Diamond' }).closest('li')!
  fireEvent.click(screen.getByRole('button', { name: 'Show materials for Hell Diamond' }))
  expect(within(hellDiamond).getAllByTestId('recipe-part').map(r => r.textContent)).toEqual(['Ruby×1', '▸Pre-fusion 1×1'])
  fireEvent.click(within(hellDiamond).getByRole('button', { name: 'Show materials for Pre-fusion 1' }))
  expect(within(hellDiamond).getAllByTestId('recipe-part').map(r => r.textContent)).toContain('Diabolic Orb×2')
})

test('a base material expands to show what it is used in, and for which goal', () => {
  renderPanel()
  fireEvent.click(screen.getByRole('button', { name: 'Show uses of Diabolic Orb' }))
  expect(screen.getAllByTestId('material-use').map(r => r.textContent)).toEqual([
    'Hell Diamond→ Glow Orb×2',
    'Pre-fusion 1→ Celestial Blade×4',
  ])
  openAlreadyHave()
  fireEvent.click(screen.getByRole('button', { name: 'Show uses of Ruby' }))
  expect(screen.getAllByTestId('material-use').map(r => r.textContent)).toContain('Glow Orb×2')
})
