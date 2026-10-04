// Syncs data/items.json, data/classes.json and public/icons/ from EvoHelper's public API. Run it by hand when a new map version
// ships, review the report and the git diff, then commit. It is NOT part of the build, CI or the runtime:
// the deployed app never calls the API. Local corrections belong in scripts/sync/convert.ts, not in items.json.
// Usage: npm run sync [path-to-saved-sync.json]
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import type { Dataset } from '../src/data/types'
import { convertSync, type EvoSync } from './sync/convert'
import { diffDatasets, staleIcons, unknownBuildItems } from './sync/report'

const SYNC_URL = 'https://evo-api.argentumheart.dev/sync'

const path = process.argv[2]
const raw = (path ? JSON.parse(readFileSync(path, 'utf8')) : await (await fetch(SYNC_URL)).json()) as EvoSync
const today = new Date().toISOString().slice(0, 10)
const { dataset, icons, fourthClasses } = convertSync(raw, today)
const prev = JSON.parse(readFileSync('data/items.json', 'utf8')) as Dataset

writeFileSync('data/items.json', JSON.stringify(dataset, null, 2) + '\n')
writeFileSync('data/classes.json', JSON.stringify({ mapVersion: dataset.mapVersion, fourthClasses }, null, 2) + '\n')
mkdirSync('public/icons', { recursive: true })
for (const icon of icons) writeFileSync(`public/icons/${icon.file}`, Buffer.from(icon.base64, 'base64'))
const stale = staleIcons(readdirSync('public/icons'), icons.map(i => i.file))
for (const file of stale) rmSync(`public/icons/${file}`)

const diff = diffDatasets(prev, dataset)
console.log(`Synced ${dataset.items.length} items and ${icons.length} icons: map ${diff.from} -> ${diff.to}`)
for (const [label, ids] of [['Added', diff.added], ['Removed', diff.removed], ['Changed', diff.changed], ['Icons removed', stale]] as const)
  if (ids.length) console.log(`${label} (${ids.length}): ${ids.join(', ')}`)
const wiki = JSON.parse(readFileSync('data/wiki-builds.json', 'utf8'))
const broken = unknownBuildItems(wiki, new Set(dataset.items.map(i => i.id)))
if (broken.length) console.warn(`Wiki builds use items no longer in the dataset:\n  ${broken.join('\n  ')}`)
if (diff.removed.length) console.warn("Removed items also drop out of users' saved builds that use them.")
