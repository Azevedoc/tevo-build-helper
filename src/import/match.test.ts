import { buildIndex } from '../data/dataset'
import { matchNames } from './match'

const index = buildIndex({
  mapVersion: '7.39b', updatedAt: '2026-10-04', seededFrom: '',
  items: [
    { id: 'ruby', name: 'Ruby', rarity: 'common', sources: [], aliases: ['Old Ruby'] },
    { id: 'deaths-edge', name: "Death's Edge", rarity: 'forged', sources: [] },
  ],
})

test('matches names ignoring case, spacing and apostrophe variants, counting duplicates', () => {
  expect(matchNames(['ruby', ' RUBY ', 'Death’s Edge', 'Mystery Thing'], index)).toEqual({
    owned: { ruby: 2, 'deaths-edge': 1 },
    unknownNames: ['Mystery Thing'],
  })
})

test('matches aliases', () => {
  expect(matchNames(['Old Ruby'], index).owned).toEqual({ ruby: 1 })
})

test('unknown names are deduped and sorted', () => {
  expect(matchNames(['Zeta', 'Alpha', 'Zeta'], index).unknownNames).toEqual(['Alpha', 'Zeta'])
})
