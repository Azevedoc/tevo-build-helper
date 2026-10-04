import type { Character } from '../storage/types'
import { ownedCounts } from './owned'

test('owned counts come from the imported save only, ignoring adjustments stored by older versions', () => {
  const c = {
    id: 'x', className: 'X', level: null, importedAt: '', unknownNames: [],
    imported: { ruby: 1, diamond: 1 }, adjustments: { ruby: -3, orb: 1 },
  } as Character
  expect(ownedCounts(c)).toEqual(new Map([['ruby', 1], ['diamond', 1]]))
})
