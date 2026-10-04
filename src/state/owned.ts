import type { Character } from '../storage/types'

/** What the character owns according to its last imported save. */
export function ownedCounts(c: Character): Map<string, number> {
  return new Map(Object.entries(c.imported).filter(([, n]) => n > 0))
}
