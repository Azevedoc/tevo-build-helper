import rawDataset from '../../data/items.json'
import type { Dataset, Item } from './types'

export function normalizeName(s: string): string {
  return s.replace(/[’‘´`]/g, "'").replace(/\s+/g, ' ').trim().toLowerCase()
}

export interface DatasetIndex {
  meta: { mapVersion: string; updatedAt: string; seededFrom: string }
  items: Map<string, Item>
  byName: Map<string, string>
}

export function buildIndex(ds: Dataset): DatasetIndex {
  const items = new Map<string, Item>()
  const byName = new Map<string, string>()
  for (const item of ds.items) {
    items.set(item.id, item)
    for (const name of [item.name, ...(item.aliases ?? [])]) byName.set(normalizeName(name), item.id)
  }
  return { meta: { mapVersion: ds.mapVersion, updatedAt: ds.updatedAt, seededFrom: ds.seededFrom }, items, byName }
}

export const dataset: DatasetIndex = buildIndex(rawDataset as Dataset)
