export const RARITIES = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'godly', 'forged', 'mythic'] as const
export type Rarity = (typeof RARITIES)[number]

export interface Source {
  where: string
  tier?: string
}

export interface RecipeInput {
  item: string
  qty: number
}

export interface Item {
  id: string
  name: string
  aliases?: string[]
  rarity: Rarity
  description?: string
  effects?: string[]
  icon?: string
  legacy?: boolean
  sources: Source[]
  recipe?: RecipeInput[]
}

export interface Dataset {
  mapVersion: string
  updatedAt: string
  seededFrom: string
  items: Item[]
}
