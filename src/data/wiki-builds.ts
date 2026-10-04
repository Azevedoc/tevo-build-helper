import snapshot from '../../data/wiki-builds.json'

const classes: Record<string, Record<string, string[]>> = snapshot.classes

/** The wiki's recommended Imp 1-3 items for a class (a one-time snapshot, see scripts/seed-wiki-builds.ts). */
export const wikiBuilds = (className: string): Record<string, string[]> => classes[className] ?? {}
