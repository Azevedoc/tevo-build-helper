import { existsSync, readFileSync } from 'node:fs'
import type { Dataset } from '../src/data/types'
import { validateDataset } from '../src/data/validate'
import { unknownBuildItems } from './sync/report'

const ds = JSON.parse(readFileSync('data/items.json', 'utf8')) as Dataset
const wiki = JSON.parse(readFileSync('data/wiki-builds.json', 'utf8'))
const errors = [
  ...validateDataset(ds, file => existsSync(`public/icons/${file}`)),
  ...unknownBuildItems(wiki, new Set(ds.items.map(i => i.id))).map(e => `wiki-builds.json: unknown item ${e}`),
]
if (errors.length > 0) {
  for (const e of errors) console.error(e)
  console.error(`${errors.length} error(s)`)
  process.exit(1)
}
console.log(`OK: ${ds.items.length} items`)
