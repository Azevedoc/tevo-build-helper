import { normalizeName, type DatasetIndex } from '../data/dataset'

export interface MatchResult {
  owned: Record<string, number>
  /** Deduped, sorted. */
  unknownNames: string[]
}

export function matchNames(names: string[], index: DatasetIndex): MatchResult {
  const owned: Record<string, number> = {}
  const unknown = new Set<string>()
  for (const name of names) {
    const id = index.byName.get(normalizeName(name))
    if (id) owned[id] = (owned[id] ?? 0) + 1
    else unknown.add(name.trim())
  }
  return { owned, unknownNames: [...unknown].sort() }
}
