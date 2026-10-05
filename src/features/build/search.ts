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

export interface ItemSource {
  label: string
  dungeon: boolean
  items: Item[]
}

const DUNGEON_TIER = /^(h|m|imp ?)(\d)$/i

/** Groups items by where they come from, dungeon tiers (H1, Imp 1, M1…) first, then NPCs and the rest by name. */
export function itemSources(index: DatasetIndex): ItemSource[] {
  const tierOf = new Map<string, string>() // a dungeon's tier, so its untiered items land in the same group
  for (const item of index.items.values()) {
    for (const source of item.sources) {
      const tier = source.tier?.trim().match(DUNGEON_TIER)
      if (tier) tierOf.set(source.where, tier[1].toLowerCase().startsWith('imp') ? `Imp ${tier[2]}` : `${tier[1].toUpperCase()}${tier[2]}`)
    }
  }
  const groups = new Map<string, ItemSource>()
  for (const item of index.items.values()) {
    for (const source of item.sources) {
      const tierLabel = tierOf.get(source.where)
      const label = tierLabel ? `${tierLabel} · ${source.where}` : source.where
      const group = groups.get(label) ?? { label, dungeon: !!tierLabel, items: [] }
      if (!group.items.includes(item)) group.items.push(item)
      groups.set(label, group)
    }
  }
  const byName = (a: Item, b: Item) => a.name.localeCompare(b.name)
  return [...groups.values()]
    .map(g => ({ ...g, items: g.items.sort(byName) }))
    .sort((a, b) => Number(b.dungeon) - Number(a.dungeon) || a.label.localeCompare(b.label, undefined, { numeric: true }))
}
