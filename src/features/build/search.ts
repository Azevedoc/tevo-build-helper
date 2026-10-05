import { normalizeName, type DatasetIndex } from '../../data/dataset'
import type { Item } from '../../data/types'

export function searchItems(index: DatasetIndex, query: string, limit = 20, include: (item: Item) => boolean = () => true): Item[] {
  const q = normalizeName(query)
  if (!q) return []
  const prefix: Item[] = []
  const substring: Item[] = []
  for (const item of index.items.values()) {
    if (!include(item)) continue
    const names = [item.name, ...(item.aliases ?? [])].map(normalizeName)
    if (names.some(n => n.startsWith(q))) prefix.push(item)
    else if (names.some(n => n.includes(q))) substring.push(item)
  }
  const byName = (a: Item, b: Item) => a.name.localeCompare(b.name)
  return [...prefix.sort(byName), ...substring.sort(byName)].slice(0, limit)
}

const GOAL_DUNGEON_TIER = /^(imp ?|m)\d$/i
const GOAL_SELLERS =
  /^(angel of |bob the builder$|magic wizard$|weapons master$|ancient soul$|champion of chaos$|hyrule prophet$|betrayed chaos$|alter ego$|skew$)/i

/** Items worth offering as goals: current gear that drops in Imp/M dungeons or is sold by the crafting NPCs. */
export function goalFilter(index: DatasetIndex): (item: Item) => boolean {
  const dungeons = new Set<string>() // by place, so a dungeon's untiered items count too
  for (const item of index.items.values())
    for (const s of item.sources) if (s.tier && GOAL_DUNGEON_TIER.test(s.tier.trim())) dungeons.add(s.where)
  return item =>
    !item.legacy && !item.name.includes('[') && item.sources.some(s => dungeons.has(s.where) || GOAL_SELLERS.test(s.where))
}
