import type { Character } from '../storage/types'

export function effectiveOwned(c: Character): Map<string, number> {
  const counts = new Map(Object.entries(c.imported))
  for (const [id, delta] of Object.entries(c.adjustments)) counts.set(id, (counts.get(id) ?? 0) + delta)
  for (const [id, n] of counts) if (n <= 0) counts.delete(id)
  return counts
}
