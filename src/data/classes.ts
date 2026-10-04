import synced from '../../data/classes.json'

// Tier 4 classes, written by the EvoHelper sync (scripts/sync-from-evohelper.ts).
const FOURTH_CLASSES = new Set(synced.fourthClasses)

export const isFourthClass = (className: string) => FOURTH_CLASSES.has(className)
