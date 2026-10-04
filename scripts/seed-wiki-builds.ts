// One-time snapshot script: copies the 4th class "Recommended items" (Imp 1-3) from the Twilight's Eve Evo
// fandom wiki into data/wiki-builds.json. It is NOT part of the build or the runtime; the app never calls the wiki.
// Usage: npm run seed-wiki-builds
import { writeFileSync } from 'node:fs'
import { dataset } from '../src/data/dataset'
import { parseRecommendations, resolveBuilds } from './wiki-builds/parse'

const API = 'https://twilights-eve-evo.fandom.com/api.php'
// Wiki module names that differ from the class name in save files.
const CLASS_NAMES: Record<string, string> = { Runemaster: 'Rune Master' }

const params = new URLSearchParams({
  action: 'query', prop: 'revisions', rvprop: 'content', rvslots: 'main', generator: 'allpages',
  gapnamespace: '828', gapprefix: 'BuildRecommendations/', gaplimit: '50', format: 'json', formatversion: '2',
})
const res = (await (await fetch(`${API}?${params}`)).json()) as {
  query: { pages: { title: string; revisions: { slots: { main: { content: string } } }[] }[] }
}

const classes: Record<string, Record<string, string[]>> = {}
for (const page of res.query.pages.sort((a, b) => a.title.localeCompare(b.title))) {
  const wikiName = page.title.replace('Module:BuildRecommendations/', '')
  const { builds, missing } = resolveBuilds(parseRecommendations(page.revisions[0].slots.main.content), dataset)
  if (missing.length) console.warn(`${wikiName}: not in data/items.json, skipped: ${missing.join(', ')}`)
  classes[CLASS_NAMES[wikiName] ?? wikiName] = builds
}

const snapshot = { source: 'https://twilights-eve-evo.fandom.com/', snapshotAt: new Date().toISOString().slice(0, 10), classes }
writeFileSync('data/wiki-builds.json', JSON.stringify(snapshot, null, 2) + '\n')
console.log(`Saved wiki builds for ${Object.keys(classes).length} classes`)
