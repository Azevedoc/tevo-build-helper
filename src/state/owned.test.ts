import type { Character } from '../storage/types'
import { effectiveOwned } from './owned'

test('adds adjustments to imported counts, clamps at zero and drops zeros', () => {
  const c: Character = {
    id: 'x', className: 'X', level: null, importedAt: '', unknownNames: [],
    imported: { ruby: 1, diamond: 1 }, adjustments: { ruby: -3, diamond: 2, orb: 1 },
  }
  expect(effectiveOwned(c)).toEqual(new Map([['diamond', 3], ['orb', 1]]))
})
