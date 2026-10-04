import { normalizeName, type DatasetIndex } from '../../src/data/dataset'

type Lua = string | Lua[] | { [key: string]: Lua }

/** Reads the `return { IMP1 = { "Item", { recommended = "Item", alternatives = {…} } } }` tables of the wiki's build modules. */
function parseLuaTable(src: string): Lua {
  const tokens: string[] = src.match(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|[A-Za-z_]\w*|[{}=,]/g) ?? []
  let i = tokens.indexOf('{')
  const value = (): Lua => {
    const t = tokens[i++]
    if (t !== '{') return t.slice(1, -1).replace(/\\(.)/g, '$1')
    const list: Lua[] = []
    const fields: Record<string, Lua> = {}
    while (tokens[i] !== '}') {
      if (tokens[i + 1] === '=') {
        const key = tokens[i]
        i += 2
        fields[key] = value()
      } else list.push(value())
      if (tokens[i] === ',') i++
    }
    i++
    return Object.keys(fields).length ? fields : list
  }
  return value()
}

export function parseRecommendations(src: string): Record<string, string[]> {
  const tiers = parseLuaTable(src) as Record<string, Lua[]>
  const out: Record<string, string[]> = {}
  for (const [tier, entries] of Object.entries(tiers))
    out[tier] = entries.map(e => (typeof e === 'string' ? e : ((e as Record<string, Lua>).recommended as string)))
  return out
}

/** Maps IMP1/IMP2/IMP3 to "Imp 1"… (IMP1TANK to "Imp 1 Tank") and item names to dataset ids. */
export function resolveBuilds(tiers: Record<string, string[]>, index: DatasetIndex) {
  const builds: Record<string, string[]> = {}
  const missing: string[] = []
  for (const [tier, names] of Object.entries(tiers)) {
    const [, n, role] = tier.match(/^IMP(\d)(TANK|DPS)?$/) ?? []
    const label = n ? `Imp ${n}${role ? ` ${role === 'TANK' ? 'Tank' : 'DPS'}` : ''}` : tier
    builds[label] = names.flatMap(name => {
      const id = index.byName.get(normalizeName(name))
      if (!id) missing.push(name)
      return id ? [id] : []
    })
  }
  return { builds, missing }
}
