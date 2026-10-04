import type { Item } from '../data/types'

export interface PlanInput {
  items: Map<string, Item>
  owned: Map<string, number>
  goals: string[]
}

export type GoalStatus = 'done' | 'in-progress' | 'not-started'

export interface GoalResult {
  goalId: string
  status: GoalStatus
  /** 0..1 */
  progress: number
  coveredUnits: number
  totalUnits: number
  /** The goal's recipe inputs, in recipe order. */
  parts: GoalPart[]
}

export interface GoalPart {
  itemId: string
  need: number
  own: number
  /** Inputs for the copies not owned; empty for base items and fully owned parts. */
  parts: GoalPart[]
}

export interface BreakdownEntry {
  /** null = the goal itself */
  parentId: string | null
  goalId: string
  count: number
}

export interface MaterialRow {
  itemId: string
  isBase: boolean
  need: number
  own: number
  missing: number
  breakdown: BreakdownEntry[]
}

export interface SourceGroup {
  where: string
  tier?: string
  items: { itemId: string; missing: number }[]
}

export interface PlanResult {
  goals: GoalResult[]
  materials: MaterialRow[]
  bySource: SourceGroup[]
  unknownGoals: string[]
}

export const UNKNOWN_SOURCE = 'Source unknown'

const compare = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true })

export function planBuild({ items, owned, goals }: PlanInput): PlanResult {
  const pool = new Map(owned)
  const rows = new Map<string, MaterialRow>()
  const leafMemo = new Map<string, number>()

  const leafUnits = (id: string): number => {
    const cached = leafMemo.get(id)
    if (cached !== undefined) return cached
    const recipe = items.get(id)?.recipe ?? []
    const units = recipe.length === 0 ? 1 : recipe.reduce((sum, r) => sum + r.qty * leafUnits(r.item), 0)
    leafMemo.set(id, units)
    return units
  }

  const goalResults: GoalResult[] = []
  const unknownGoals: string[] = []

  for (const goalId of goals) {
    if (!items.has(goalId)) {
      unknownGoals.push(goalId)
      continue
    }
    let covered = 0
    const root: GoalPart = { itemId: goalId, need: 0, own: 0, parts: [] }

    // Returns true when the item was taken from the pool.
    const need = (id: string, parentId: string | null, parentPart: GoalPart | null): boolean => {
      let part = root
      if (parentPart) {
        part = parentPart.parts.find(p => p.itemId === id) ?? { itemId: id, need: 0, own: 0, parts: [] }
        if (!parentPart.parts.includes(part)) parentPart.parts.push(part)
      }
      part.need++
      const recipe = items.get(id)?.recipe ?? []
      let row = rows.get(id)
      if (!row) {
        row = { itemId: id, isBase: recipe.length === 0, need: 0, own: 0, missing: 0, breakdown: [] }
        rows.set(id, row)
      }
      row.need++
      const entry = row.breakdown.find(b => b.parentId === parentId && b.goalId === goalId)
      if (entry) entry.count++
      else row.breakdown.push({ parentId, goalId, count: 1 })

      const available = pool.get(id) ?? 0
      if (available > 0) {
        pool.set(id, available - 1)
        row.own++
        covered += leafUnits(id)
        part.own++
        return true
      }
      row.missing++
      for (const input of recipe) for (let i = 0; i < input.qty; i++) need(input.item, id, part)
      return false
    }

    const ownedGoal = need(goalId, null, null)
    const total = leafUnits(goalId)
    goalResults.push({
      goalId,
      status: ownedGoal ? 'done' : covered === 0 ? 'not-started' : 'in-progress',
      progress: covered / total,
      coveredUnits: covered,
      totalUnits: total,
      parts: root.parts,
    })
  }

  const nameOf = (id: string) => items.get(id)?.name ?? id
  const materials = [...rows.values()].sort((a, b) => b.missing - a.missing || compare(nameOf(a.itemId), nameOf(b.itemId)))

  const groups = new Map<string, SourceGroup>()
  for (const row of materials) {
    if (!row.isBase || row.missing === 0) continue
    const sources = items.get(row.itemId)?.sources ?? []
    for (const s of sources.length ? sources : [{ where: UNKNOWN_SOURCE }]) {
      const key = `${s.where}\u0000${s.tier ?? ''}`
      let group = groups.get(key)
      if (!group) {
        group = s.tier ? { where: s.where, tier: s.tier, items: [] } : { where: s.where, items: [] }
        groups.set(key, group)
      }
      group.items.push({ itemId: row.itemId, missing: row.missing })
    }
  }
  const bySource = [...groups.values()].sort((a, b) => {
    if (a.where === UNKNOWN_SOURCE || b.where === UNKNOWN_SOURCE) return a.where === UNKNOWN_SOURCE ? 1 : -1
    return compare(a.where, b.where) || compare(a.tier ?? '', b.tier ?? '')
  })
  for (const g of bySource) g.items.sort((a, b) => compare(nameOf(a.itemId), nameOf(b.itemId)))

  return { goals: goalResults, materials, bySource, unknownGoals }
}
