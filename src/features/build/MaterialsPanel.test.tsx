import { fireEvent, render, screen } from '@testing-library/react'
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

test('groups missing materials by source, unknown last', () => {
  renderPanel()
  expect(screen.queryByRole('tab')).not.toBeInTheDocument()
  const groups = screen.getAllByTestId('source-group')
  expect(groups[0]).toHaveTextContent('Agahnim · H2')
  expect(groups[0]).toHaveTextContent('Ruby ×2')
  expect(groups[1]).toHaveTextContent(UNKNOWN_SOURCE)
})

test('+ and − adjust owned counts', () => {
  const onAdjust = renderPanel()
  fireEvent.click(screen.getByRole('button', { name: 'Own one more Ruby' }))
  fireEvent.click(screen.getByRole('button', { name: 'Own one less Diamond' }))
  expect(onAdjust.mock.calls).toEqual([['ruby', 1]])
})
