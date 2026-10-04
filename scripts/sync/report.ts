import type { Dataset } from '../../src/data/types'

/** What a sync changed, by item id. */
export function diffDatasets(prev: Dataset, next: Dataset) {
  const before = new Map(prev.items.map(i => [i.id, JSON.stringify(i)]))
  const after = new Map(next.items.map(i => [i.id, JSON.stringify(i)]))
  return {
    from: prev.mapVersion,
    to: next.mapVersion,
    added: [...after.keys()].filter(id => !before.has(id)),
    removed: [...before.keys()].filter(id => !after.has(id)),
    changed: [...after].filter(([id, json]) => before.has(id) && before.get(id) !== json).map(([id]) => id),
  }
}

/** Wiki build items missing from the dataset, as "Class Build: id". */
export function unknownBuildItems(wiki: { classes: Record<string, Record<string, string[]>> }, ids: Set<string>): string[] {
  return Object.entries(wiki.classes)
    .flatMap(([cls, builds]) =>
      Object.entries(builds).flatMap(([build, items]) => items.filter(id => !ids.has(id)).map(id => `${cls} ${build}: ${id}`)),
    )
    .sort()
}

export const staleIcons = (files: string[], used: string[]): string[] => files.filter(f => !used.includes(f))
