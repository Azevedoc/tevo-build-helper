export interface ParsedSave {
  hero: string
  level: number | null
  /** Non-empty inventory and stash item names, in file order. */
  slotNames: string[]
}

export class SaveParseError extends Error {}

const PRELOAD = /call Preload\(\s*"(.*)"\s*\)/
const SLOT = /^(?:Item|Stash[2-6]? Item) [1-6]:(.*)$/
const HERO = /^Hero:(.*)$/

/** Removes Warcraft III color codes (`|cffRRGGBB…|r`, either case) that wrap item names in real saves. */
const stripColorCodes = (s: string) => s.replace(/\|c[0-9a-f]{8}/gi, '').replace(/\|r/gi, '')

export function parseSave(text: string, fileName?: string): ParsedSave {
  let hero: string | null = null
  const slotNames: string[] = []

  for (const line of text.replace(/^﻿/, '').split(/\r?\n/)) {
    const payload = PRELOAD.exec(line)?.[1]
    if (payload === undefined) continue
    const heroMatch = HERO.exec(payload)
    if (heroMatch) {
      hero = heroMatch[1].trim()
      continue
    }
    const slot = SLOT.exec(payload)?.[1]
    const name = slot === undefined ? undefined : stripColorCodes(slot).trim()
    if (name) slotNames.push(name)
  }

  if (!hero) throw new SaveParseError("Couldn't read this file: no hero found. Is it a Twilight's Eve Evo save?")
  const level = fileName ? /\[Level (\d+)\]/.exec(fileName)?.[1] : undefined
  return { hero, level: level ? Number(level) : null, slotNames }
}
