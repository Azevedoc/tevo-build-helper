// One-time provenance script: seeds data/items.json and public/icons/ from EvoHelper's public API.
// It is NOT part of the build or the runtime. After the initial seed, data/items.json is maintained by hand;
// re-running this overwrites all manual edits.
// Usage: npm run seed [path-to-saved-sync.json]
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { convertSync, type EvoSync } from './seed/convert'

const SYNC_URL = 'https://evo-api.argentumheart.dev/sync'

const path = process.argv[2]
const raw = (path ? JSON.parse(readFileSync(path, 'utf8')) : await (await fetch(SYNC_URL)).json()) as EvoSync
const today = new Date().toISOString().slice(0, 10)
const { dataset, icons } = convertSync(raw, today)

writeFileSync('data/items.json', JSON.stringify(dataset, null, 2) + '\n')
mkdirSync('public/icons', { recursive: true })
for (const icon of icons) writeFileSync(`public/icons/${icon.file}`, Buffer.from(icon.base64, 'base64'))
console.log(`Seeded ${dataset.items.length} items and ${icons.length} icons (map ${dataset.mapVersion})`)
