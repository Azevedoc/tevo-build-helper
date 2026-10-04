import { fireEvent, render, screen, within } from '@testing-library/react'
import type { Item } from '../../data/types'
import { UNKNOWN_SOURCE, type PlanResult } from '../../engine/plan'
import { MaterialsPanel } from './MaterialsPanel'

const item = (id: string, name: string, sources: Item['sources'] = []): Item => ({ id, name, rarity: 'common', sources })
const items = new Map<string, Item>([
  ['diabolic-orb', item('diabolic-orb', 'Diabolic Orb', [{ where: 'Demon of Fire', tier: 'H1' }])],
  ['hell-diamond', item('hell-diamond', 'Hell Diamond')],
  ['pre-fusion-1', item('pre-fusion-1', 'Pre-fusion 1')],
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
    { itemId: 'ruby', isBase: true, need: 2, own: 2, missing: 0, breakdown: [{ parentId: 'glow-orb', goalId: 'glow-orb', count: 2 }] },
  ],
  bySource: [
    { where: 'Agahnim', tier: 'H2', items: [{ itemId: 'ruby', missing: 2 }] },
    { where: UNKNOWN_SOURCE, items: [{ itemId: 'diamond', missing: 1 }] },
  ],
}

const renderPanel = (onAdjust = vi.fn()) => {
  render(<MaterialsPanel plan={plan} items={items} owned={new Map([['diabolic-orb', 3]])} onAdjust={onAdjust} />)
  return onAdjust
}

beforeEach(() => localStorage.clear())

test('by material shows totals, tier and breakdown', () => {
  renderPanel()
  const row = screen.getByTestId('material-diabolic-orb')
  // 'have' is the real owned count (3), even when the plan only uses 1 of them
  expect(row).toHaveTextContent('need 6 · have 3 · missing 5')
  expect(row).toHaveTextContent('H1')
  expect(row).toHaveTextContent('2 × via Hell Diamond (for Glow Orb)')
  expect(row).toHaveTextContent('4 × via Pre-fusion 1 (for Celestial Blade)')
})

test('goal breakdown entries render as goal', () => {
  renderPanel()
  expect(screen.getByTestId('material-glow-orb')).toHaveTextContent('1 × goal (Glow Orb)')
})

test('complete rows show a check mark', () => {
  renderPanel()
  expect(screen.getByTestId('material-ruby')).toHaveTextContent('✓')
})

test('+ and − adjust owned counts', () => {
  const onAdjust = renderPanel()
  const row = screen.getByTestId('material-diabolic-orb')
  fireEvent.click(within(row).getByRole('button', { name: 'Own one more Diabolic Orb' }))
  fireEvent.click(within(row).getByRole('button', { name: 'Own one less Diabolic Orb' }))
  expect(onAdjust.mock.calls).toEqual([['diabolic-orb', 1], ['diabolic-orb', -1]])
})

test('by source groups missing materials, unknown last', () => {
  renderPanel()
  fireEvent.click(screen.getByRole('tab', { name: 'By source' }))
  const groups = screen.getAllByTestId('source-group')
  expect(groups[0]).toHaveTextContent('Agahnim · H2')
  expect(groups[0]).toHaveTextContent('Ruby ×2')
  expect(groups[1]).toHaveTextContent(UNKNOWN_SOURCE)
})
