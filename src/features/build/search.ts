import { normalizeName, type DatasetIndex } from '../../data/dataset'
import type { Item } from '../../data/types'

export function searchItems(index: DatasetIndex, query: string, limit = 20): Item[] {
  const q = normalizeName(query)
  if (!q) return []
  const prefix: Item[] = []
  const substring: Item[] = []
  for (const item of index.items.values()) {
    const names = [item.name, ...(item.aliases ?? [])].map(normalizeName)
    if (names.some(n => n.startsWith(q))) prefix.push(item)
    else if (names.some(n => n.includes(q))) substring.push(item)
  }
  const byName = (a: Item, b: Item) => a.name.localeCompare(b.name)
  return [...prefix.sort(byName), ...substring.sort(byName)].slice(0, limit)
}
