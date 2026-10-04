import type { Dataset, Item, Rarity, RecipeInput } from '../../src/data/types'

export interface EvoSync {
  version: string
  data: {
    items: {
      id: number; name: string; displayName: string; icon: string; iconBase64: string | null; legacyItem: boolean
      description: string | null; effects: string | null; rarityId: number; source: string | null; sourceShort: string | null
    }[]
    itemRecipes: { id: number; outputId: number; inputId: number; quantity: number }[]
    itemRarities: { id: number; name: string }[]
  }
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/['’‘´`]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function convertSync(raw: EvoSync, today: string): { dataset: Dataset; icons: { file: string; base64: string }[] } {
  const rarityById = new Map(raw.data.itemRarities.map(r => [r.id, r.name.toLowerCase() as Rarity]))

  const slugById = new Map<number, string>()
  const used = new Set<string>()
  for (const it of raw.data.items) {
    const base = slugify(it.name)
    let slug = base
    for (let n = 2; used.has(slug); n++) slug = `${base}-${n}`
    used.add(slug)
    slugById.set(it.id, slug)
  }

  const icons: { file: string; base64: string }[] = []
  const items: Item[] = raw.data.items.map(it => {
    const id = slugById.get(it.id)!
    const item: Item = { id, name: it.name, rarity: rarityById.get(it.rarityId)!, sources: [] }
    if (it.description) item.description = it.description
    const effects = (it.effects ?? '').split('$').map(e => e.trim()).filter(Boolean)
    if (effects.length) item.effects = effects
    if (it.iconBase64) {
      item.icon = `${id}.png`
      icons.push({ file: item.icon, base64: it.iconBase64.replace(/^data:image\/png;base64,/, '') })
    }
    if (it.legacyItem) item.legacy = true
    if (it.source) item.sources = [it.sourceShort ? { where: it.source, tier: it.sourceShort } : { where: it.source }]

    const qtyByInput = new Map<number, number>()
    for (const r of raw.data.itemRecipes) {
      if (r.outputId === it.id) qtyByInput.set(r.inputId, (qtyByInput.get(r.inputId) ?? 0) + r.quantity)
    }
    const recipe: RecipeInput[] = [...qtyByInput]
      .sort(([a], [b]) => a - b)
      .map(([inputId, qty]) => ({ item: slugById.get(inputId)!, qty }))
    if (recipe.length) item.recipe = recipe
    return item
  })

  items.sort((a, b) => a.id.localeCompare(b.id))
  return {
    dataset: { mapVersion: raw.version, updatedAt: today, seededFrom: `EvoHelper API sync, map ${raw.version}, ${today}`, items },
    icons,
  }
}
