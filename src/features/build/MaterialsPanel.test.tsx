import { fireEvent, render, screen } from '@testing-library/react'
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
  ['diamond', item('diamond', 'Diamond')],
])

const plan: PlanResult = {
  goals: [],
  unknownGoals: [],
  materials: [
    {
      itemId: 'diabolic-orb', isBase: true, need: 6, own: 1, missing: 5,
      breakdown: [
        { parentId: 'hell-diamond', goalId: 'glow-orb', count: 2 },
        { parentId: 'pre-fusion-1', goalId: 'celestial-blade', count: 4 },
      ],
    },
    { itemId: 'glow-orb', isBase: false, need: 1, own: 0, missing: 1, breakdown: [{ parentId: null, goalId: 'glow-orb', count: 1 }] },
    { itemId: 'hell-diamond', isBase: false, need: 1, own: 1, missing: 0, breakdown: [{ parentId: 'glow-orb', goalId: 'glow-orb', count: 1 }] },
    { itemId: 'ruby', isBase: true, need: 2, own: 2, missing: 0, breakdown: [{ parentId: 'glow-orb', goalId: 'glow-orb', count: 2 }] },
  ],
  bySource: [
    { where: 'Agahnim', tier: 'H2', items: [{ itemId: 'ruby', missing: 2 }] },
    { where: UNKNOWN_SOURCE, items: [{ itemId: 'diamond', missing: 1 }] },
  ],
}

const renderPanel = (owned = new Map([['diabolic-orb', 3], ['ruby', 4], ['hell-diamond', 1]])) => render(<MaterialsPanel plan={plan} items={items} owned={owned} />)

test('groups missing materials by source, unknown last', () => {
  renderPanel()
  expect(screen.getByRole('tab', { name: 'To farm' })).toHaveAttribute('aria-selected', 'true')
  const groups = screen.getAllByTestId('source-group')
  expect(groups[0]).toHaveTextContent('Agahnim · H2')
  expect(groups[0]).toHaveTextContent('Ruby ×2')
  expect(groups[1]).toHaveTextContent(UNKNOWN_SOURCE)
})

test('owned tab shows owned out of needed for each item the goals use, green when enough', () => {
  renderPanel()
  fireEvent.click(screen.getByRole('tab', { name: 'Owned' }))
  const rows = screen.getAllByTestId('owned-row')
  expect(rows.map(r => r.textContent)).toEqual(['Diabolic Orb3/6', '▸Hell Diamond1/1', 'Ruby4/2'])
  expect(screen.getByText('3/6')).not.toHaveClass('text-emerald-400')
  expect(screen.getByText('4/2')).toHaveClass('text-emerald-400')
  expect(screen.queryByTestId('source-group')).not.toBeInTheDocument()
})

test('owned tab says when nothing owned is used', () => {
  const nothingOwned = { ...plan, materials: plan.materials.map(m => ({ ...m, own: 0, missing: m.need })) }
  render(<MaterialsPanel plan={nothingOwned} items={items} owned={new Map()} />)
  fireEvent.click(screen.getByRole('tab', { name: 'Owned' }))
  expect(screen.getByText('Nothing you own is used by these goals yet.')).toBeInTheDocument()
})

test('a crafted item in the owned tab expands to show its recipe, nested', () => {
  renderPanel()
  fireEvent.click(screen.getByRole('tab', { name: 'Owned' }))
  expect(screen.queryByRole('button', { name: 'Show materials for Ruby' })).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Show materials for Hell Diamond' }))
  expect(screen.getAllByTestId('recipe-part').map(r => r.textContent)).toEqual(['Ruby×1', '▸Pre-fusion 1×1'])
  fireEvent.click(screen.getByRole('button', { name: 'Show materials for Pre-fusion 1' }))
  expect(screen.getAllByTestId('recipe-part').map(r => r.textContent)).toContain('Diabolic Orb×2')
})
