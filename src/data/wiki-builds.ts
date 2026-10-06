import snapshot from '../../data/wiki-builds.json'

const classes: Record<string, Record<string, string[]>> = snapshot.classes

/** Adds an "Imp N Both" build with every item of "Imp N Tank" and "Imp N DPS" when a class has both. */
export function withCombinedRoles(builds: Record<string, string[]>): Record<string, string[]> {
  const out = { ...builds }
  for (const tier of Object.keys(builds)) {
    const imp = tier.match(/^(Imp \d) Tank$/)?.[1]
    const dps = imp && builds[`${imp} DPS`]
    if (dps) out[`${imp} Both`] = [...new Set([...builds[tier], ...dps])]
  }
  return out
}

/** The wiki's recommended Imp 1-3 items for a class (a one-time snapshot, see scripts/seed-wiki-builds.ts). */
export const wikiBuilds = (className: string): Record<string, string[]> => withCombinedRoles(classes[className] ?? {})
