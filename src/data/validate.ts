import { normalizeName } from './dataset'
import { RARITIES, type Dataset } from './types'

export function validateDataset(ds: Dataset, iconExists?: (file: string) => boolean): string[] {
  const errors: string[] = []
  const ids = new Set<string>()
  const names = new Map<string, string>()

  for (const item of ds.items) {
    if (ids.has(item.id)) errors.push(`duplicate id: ${item.id}`)
    ids.add(item.id)
    for (const name of [item.name, ...(item.aliases ?? [])]) {
      const key = normalizeName(name)
      const owner = names.get(key)
      if (owner !== undefined && owner !== item.id) errors.push(`duplicate name: "${name}" (${owner}, ${item.id})`)
      names.set(key, item.id)
    }
    if (!(RARITIES as readonly string[]).includes(item.rarity)) errors.push(`${item.id}: unknown rarity "${item.rarity}"`)
    if (item.icon && iconExists && !iconExists(item.icon)) errors.push(`${item.id}: icon file not found: ${item.icon}`)
  }

  const byId = new Map(ds.items.map(i => [i.id, i]))
  for (const item of ds.items) {
    for (const input of item.recipe ?? []) {
      if (!byId.has(input.item)) errors.push(`${item.id}: recipe input does not exist: ${input.item}`)
      if (!Number.isInteger(input.qty) || input.qty < 1) errors.push(`${item.id}: invalid qty ${input.qty} for ${input.item}`)
    }
  }

  const visited = new Set<string>()
  const visiting = new Set<string>()
  const visit = (id: string, path: string[]): void => {
    if (visited.has(id)) return
    if (visiting.has(id)) {
      errors.push(`recipe cycle: ${[...path, id].join(' -> ')}`)
      return
    }
    visiting.add(id)
    for (const input of byId.get(id)?.recipe ?? []) if (byId.has(input.item)) visit(input.item, [...path, id])
    visiting.delete(id)
    visited.add(id)
  }
  for (const item of ds.items) visit(item.id, [])

  return errors
}
