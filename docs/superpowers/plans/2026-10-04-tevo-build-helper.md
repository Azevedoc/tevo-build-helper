# TEvo Build Helper Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A static web app that imports a Twilight's Eve Evo save file, lets the player pick goal items, and shows per-goal progress plus total remaining materials (with breakdown and by-source grouping).

**Architecture:** Our own curated dataset (`data/items.json`, seeded once from EvoHelper's API) is bundled into a Vite + React SPA. A pure planner engine computes results from dataset + owned items + goals. Characters and builds persist in IndexedDB. Deployed to GitHub Pages by GitHub Actions.

**Tech Stack:** Node 22, Vite, React 19, TypeScript (strict), Tailwind CSS v4 (`@tailwindcss/vite`), Zustand, `idb`, `@dnd-kit/core` + `@dnd-kit/sortable`, Vitest + jsdom + Testing Library, `fake-indexeddb` (tests), `tsx` (scripts).

**Spec:** `docs/superpowers/specs/2026-10-04-tevo-build-helper-design.md`

## Global Constraints

- License: AGPL-3.0. No code copied from EvoHelper (`EvoHelper/` is a git-ignored reference only).
- No runtime network calls. No backend. The EvoHelper API is used only by the one-time seed script.
- Data lives in `data/items.json`; icons in `public/icons/`. Map version `7.39b`.
- Crafting consumes all inputs, produces exactly one output.
- No class-restriction filtering, no forge-station info, no "craftable now", no farming recommendations.
- Navigation is hash-based (`#/`, `#/character/<id>`, `#/data`); Vite `base: './'` so the build works under any GitHub Pages path.
- Dark theme only.
- On Windows the bash shell may not have Node on PATH: prefix commands with `export PATH="$PATH:/c/Program Files/nodejs"` if `node` is not found.
- Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. Item names in saves that differ from the dataset only by case, surrounding/double spaces, or apostrophe variants (`'` `’` `´` `` ` ``) must still match → test in Task 5.
2. Same item in several slots (inventory + stashes) must count as several owned copies → test in Task 5.
3. The same goal item added twice to a build must be planned twice against the shared pool → test in Task 4.
4. Manual adjustments that would push an owned count below zero must clamp at 0, not go negative → test in Task 6.
5. Save files saved with a UTF-8 BOM or CRLF line endings must parse identically → test in Task 5.

---

### Task 1: Project scaffold

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/index.css`, `src/test-setup.ts`, `src/App.test.tsx`, `LICENSE`, `THIRD-PARTY-NOTICES.md`, `README.md`
- Modify: `.gitignore` (already ignores `EvoHelper/`, `node_modules/`, `dist/`)

**Interfaces:**
- Produces: npm scripts `dev`, `build` (`tsc -b && vite build`), `test` (`vitest run`), `typecheck` (`tsc -b --noEmit` or equivalent), `validate-data` (added in Task 2), `seed` (added in Task 3).

- [ ] **Step 1:** Scaffold with `npm create vite@latest . -- --template react-ts` in a temp dir and move files in (the repo root is non-empty), or write the files by hand. Install deps listed in Tech Stack. Enable `"strict": true`. In `vite.config.ts`: `base: './'`, plugins `react()` and `tailwindcss()`, and a `test` block with `environment: 'jsdom'`, `setupFiles: ['src/test-setup.ts']` (imports `@testing-library/jest-dom/vitest` and `fake-indexeddb/auto`).
- [ ] **Step 2:** Write `src/App.test.tsx`: renders `<App />` and expects text `TEvo Build Helper`. Run `npm test`, see FAIL (App lacks heading) then make `App` render an `<h1>TEvo Build Helper</h1>` on a dark background (`bg-neutral-950 text-neutral-100`). Run `npm test` → PASS.
- [ ] **Step 3:** `LICENSE` = full AGPL-3.0 text (copy `EvoHelper/LICENSE`, it is the verbatim GNU text). `THIRD-PARTY-NOTICES.md`: credit "Item data seeded from EvoHelper (https://codeberg.org/ArgentumHeart/EvoHelper) by ArgentumHeart, via its public API, map 7.39b, 2026-10-04"; Warcraft III assets © Blizzard Entertainment; map data belongs to the Twilight's Eve Evo authors; unofficial, non-commercial, no affiliation. `README.md`: one paragraph purpose, `npm install`, `npm run dev`, `npm test`, how to update data (edit `data/items.json`, run `npm run validate-data`).
- [ ] **Step 4:** Run `npm run build` → exits 0, `dist/index.html` exists.
- [ ] **Step 5:** Commit `chore: scaffold Vite React TS app`.

---

### Task 2: Dataset types, index and validation

**Files:**
- Create: `src/data/types.ts`, `src/data/validate.ts`, `src/data/validate.test.ts`, `src/data/dataset.ts`, `scripts/validate-data.ts`, `data/items.json` (placeholder: `{"mapVersion":"7.39b","updatedAt":"2026-10-04","seededFrom":"","items":[]}`)

**Interfaces:**
- Produces (`src/data/types.ts`): `Rarity`, `RARITIES: readonly Rarity[]` (order: common, uncommon, rare, epic, legendary, godly, forged, mythic), `Source {where: string; tier?: string}`, `RecipeInput {item: string; qty: number}`, `Item`, `Dataset` — exactly as spec §2.2 including `legacy?: boolean`.
- Produces (`src/data/validate.ts`): `validateDataset(ds: Dataset, iconExists?: (file: string) => boolean): string[]` — returns human-readable error strings, empty = valid.
- Produces (`src/data/dataset.ts`): `normalizeName(s: string): string`; `interface DatasetIndex { meta: {mapVersion: string; updatedAt: string; seededFrom: string}; items: Map<string, Item>; byName: Map<string, string> /* normalized name or alias → id */ }`; `buildIndex(ds: Dataset): DatasetIndex`; `dataset: DatasetIndex` (built from `data/items.json` import).

- [ ] **Step 1: Failing tests** in `validate.test.ts`, each on a tiny inline dataset:
  - valid 3-item dataset (A ← B×2 + C) → `[]`
  - recipe referencing `"missing"` → one error containing `missing`
  - cycle A→B→A → error containing `cycle`
  - duplicate id → error containing `duplicate id`
  - name of one item equals alias of another, differing only by case → error containing `duplicate name`
  - rarity `"shiny"` → error containing `rarity`
  - qty `0` and qty `1.5` → errors containing `qty`
  - `iconExists` returning false for `a.png` → error containing `a.png`
  - and in `dataset.test.ts`: `normalizeName("  Death´s   Realm ")` === `normalizeName("death's realm")`; `normalizeName` maps `’ ‘ ´ \`` to `'`, collapses whitespace, trims, lowercases.
- [ ] **Step 2:** `npx vitest run src/data` → FAIL (modules missing).
- [ ] **Step 3:** Implement types, `validateDataset` (cycle check via DFS with visiting/visited sets), `normalizeName`, `buildIndex`.
- [ ] **Step 4:** `scripts/validate-data.ts`: reads `data/items.json`, calls `validateDataset` with `iconExists = f => existsSync('public/icons/' + f)`, prints errors and exits 1 if any, else prints `OK: <n> items`. Add npm script `"validate-data": "tsx scripts/validate-data.ts"`.
- [ ] **Step 5:** `npx vitest run src/data` → PASS; `npm run validate-data` → `OK: 0 items`.
- [ ] **Step 6:** Commit `feat: dataset types, index and validation`.

---

### Task 3: One-time seed from EvoHelper

**Files:**
- Create: `scripts/seed/convert.ts`, `scripts/seed/convert.test.ts`, `scripts/seed-from-evohelper.ts`
- Generate: `data/items.json`, `public/icons/*.png`
- Modify: `vite.config.ts` test `include` to also cover `scripts/**/*.test.ts`

**Interfaces:**
- Consumes: `Dataset`, `Item`, `RARITIES`, `validateDataset` (Task 2).
- Produces: `convertSync(raw: EvoSync, today: string): { dataset: Dataset; icons: { file: string; base64: string }[] }`, `slugify(name: string): string`.

Raw API shape (`EvoSync`, define it in `convert.ts`): `{ version: string; data: { items: { id: number; name: string; displayName: string; icon: string; iconBase64: string | null; legacyItem: boolean; description: string | null; effects: string | null; rarityId: number; source: string | null; sourceShort: string | null }[]; itemRecipes: { id: number; outputId: number; inputId: number; quantity: number }[]; itemRarities: { id: number; name: string }[] } }`.

Mapping rules:
- `id` = `slugify(name)`: lowercase, strip apostrophe variants, non-alphanumerics → `-`, collapse/trim dashes. On collision append `-2`, `-3`.
- `rarity` = rarity name for `rarityId`, lowercased.
- `description` omitted if empty; `effects` = `effects.split('$')`, trimmed, empties dropped, omitted if none.
- `sources` = `[{ where: source, tier: sourceShort }]` when `source` non-empty (omit `tier` when empty), else `[]`. Keep `sourceShort` values like `4000000 Gold, 2000 Shards` verbatim as `tier`.
- `recipe` = rows with `outputId === item.id`, merged by input (sum quantities), mapped to slugs, sorted by input id; omitted when none.
- `legacy: true` only when `legacyItem`.
- `icon` = `<id>.png` when `iconBase64` present (strip `data:image/png;base64,` prefix).
- `mapVersion` = `raw.version`, `updatedAt` = `today`, `seededFrom` = `EvoHelper API sync, map <version>, <today>`; items sorted by id.

- [ ] **Step 1: Failing tests** with a 4-item fixture: slug of `Death´s Edge` is `deaths-edge`; two inputs with `quantity: 2` and a duplicated row for the same input produce one `RecipeInput` with summed qty; effects `"+10 Damage$+5 Armor"` → `["+10 Damage","+5 Armor"]`; empty `source` → `sources: []`; `rarityId` 7 → `"forged"`; legacy flag carried; output passes `validateDataset`.
- [ ] **Step 2:** `npx vitest run scripts` → FAIL.
- [ ] **Step 3:** Implement `convertSync`, `slugify`.
- [ ] **Step 4:** `npx vitest run scripts` → PASS.
- [ ] **Step 5:** `scripts/seed-from-evohelper.ts`: fetch `https://evo-api.argentumheart.dev/sync` (or read a path given as argv[2]), run `convertSync` with today's date, write `data/items.json` (2-space JSON, trailing newline) and each icon to `public/icons/`. Header comment: one-time provenance script, not part of build or runtime. npm script `"seed": "tsx scripts/seed-from-evohelper.ts"`.
- [ ] **Step 6:** `npm run seed` then `npm run validate-data` → `OK: 513 items` (count may differ slightly if the API changed; any validation error must be investigated, not suppressed). Spot-check: `hyperion` recipe has 4 inputs; `glow-orb` has 4 inputs.
- [ ] **Step 7:** Commit `feat: seed dataset from EvoHelper (map 7.39b)` including `data/` and `public/icons/`.

---

### Task 4: Planner engine

**Files:**
- Create: `src/engine/plan.ts`, `src/engine/plan.test.ts`

**Interfaces:**
- Consumes: `Item` (Task 2).
- Produces:
```ts
export interface PlanInput { items: Map<string, Item>; owned: Map<string, number>; goals: string[] }
export type GoalStatus = 'done' | 'in-progress' | 'not-started'
export interface GoalResult { goalId: string; status: GoalStatus; progress: number /* 0..1 */; coveredUnits: number; totalUnits: number }
export interface BreakdownEntry { parentId: string | null /* null = the goal itself */; goalId: string; count: number }
export interface MaterialRow { itemId: string; isBase: boolean; need: number; own: number; missing: number; breakdown: BreakdownEntry[] }
export interface SourceGroup { where: string; tier?: string; items: { itemId: string; missing: number }[] }
export interface PlanResult { goals: GoalResult[]; materials: MaterialRow[]; bySource: SourceGroup[]; unknownGoals: string[] }
export function planBuild(input: PlanInput): PlanResult
export const UNKNOWN_SOURCE = 'Source unknown'
```

Semantics (spec §4):
- Pool = copy of `owned`. Goals processed in order; goal ids not in `items` go to `unknownGoals` and are skipped.
- `need(item, parent, goal)`: every visit increments `need` and the `(parent, goal)` breakdown count for that item. If pool has it → decrement pool, `own++`, add `leafUnits(item)` to the goal's covered units, stop. Else if it has a recipe → `missing++`, recurse into each input `qty` times. Else → `missing++` (base material).
- `leafUnits(item)` = 1 for base materials, else Σ qty × leafUnits(input) (memoize). `totalUnits` = `leafUnits(goal)`.
- Status: `done` if the goal itself came from the pool; else `not-started` if `coveredUnits === 0`; else `in-progress`. `progress = coveredUnits / totalUnits`.
- `materials`: one row per item visited, including the goal items themselves (their breakdown entry has `parentId: null`); sort by `missing` desc then item name.
- `bySource`: base materials (`isBase`) with `missing > 0`; one entry per `Source` of the item (an item with 2 sources appears in 2 groups); items with no sources go under `{ where: UNKNOWN_SOURCE }`. Groups sorted by `where` then `tier` (undefined first, `localeCompare` with `numeric: true`), unknown-source group last; items within a group sorted by name.

- [ ] **Step 1: Failing tests** on a hand-built dataset (`ruby`, `diamond`, `diabolic-orb` base; `hell-diamond` ← ruby + diabolic-orb×2; `glow-orb` ← hell-diamond + diamond + ruby; `blade` ← hell-diamond + diabolic-orb):
  - nothing owned, goals `[glow-orb]` → glow-orb `not-started`, progress 0, totalUnits 5; diabolic-orb row `need 2, own 0, missing 2`, breakdown `[{parentId:'hell-diamond', goalId:'glow-orb', count:2}]`.
  - owned `hell-diamond:1`, goals `[glow-orb]` → diabolic-orb row absent (subtree cut); coveredUnits 3/5, `in-progress`.
  - owned `glow-orb:1` → status `done`, progress 1, no ruby row.
  - goals `[glow-orb, blade]`, owned `diabolic-orb:3` → diabolic-orb `need 5, own 3, missing 2`, breakdown has entries for `(hell-diamond, glow-orb):2`, `(hell-diamond, blade):2`, `(blade, blade):1`; glow-orb consumes its 2 first (order).
  - Review Focus #3: goals `[glow-orb, glow-orb]` → ruby `need 4`, two GoalResults.
  - goals `['removed-item']` → `unknownGoals: ['removed-item']`, no rows.
  - bySource: ruby with sources `[{where:'Shop'},{where:'Agahnim',tier:'H2'}]` appears in both groups; diamond with no sources lands in `Source unknown`, which is last.
- [ ] **Step 2:** `npx vitest run src/engine` → FAIL.
- [ ] **Step 3:** Implement `planBuild`.
- [ ] **Step 4:** `npx vitest run src/engine` → PASS. Add one test using the real `dataset` from Task 2/3: `planBuild({items: dataset.items, owned: new Map(), goals: ['hyperion']})` matches an inline snapshot (`toMatchSnapshot`) and `goals[0].totalUnits > 0`.
- [ ] **Step 5:** Commit `feat: planner engine`.

---

### Task 5: Save-file parser and name matching

**Files:**
- Create: `src/import/parse-save.ts`, `src/import/parse-save.test.ts`, `src/import/match.ts`, `src/import/match.test.ts`, `src/import/__fixtures__/paladin.txt`

**Interfaces:**
- Consumes: `normalizeName`, `DatasetIndex` (Task 2).
- Produces:
```ts
export interface ParsedSave { hero: string; level: number | null; slotNames: string[] /* non-empty inventory + stash names, in file order */ }
export class SaveParseError extends Error {}
export function parseSave(text: string, fileName?: string): ParsedSave   // throws SaveParseError when no Hero line
export interface MatchResult { owned: Record<string, number>; unknownNames: string[] /* deduped, sorted */ }
export function matchNames(names: string[], index: DatasetIndex): MatchResult
```

Parsing: payload = text inside `call Preload( "…" )`. Recognized payloads: `Hero: X`; `Item N: X` (N 1–6); `Stash Item N: X` and `StashK Item N: X` (K 2–6). Empty `X` = empty slot. Level from filename `[Level N]`. Strip leading BOM; accept `\r\n`.

- [ ] **Step 1:** Fixture `paladin.txt` in the format of spec §3.1 (Hero `Paladin`, items 1–3 filled and 4–6 empty, `Stash Item 1: Ruby`, `Stash2 Item 4: Ruby`, plus Gold/Power Shard/prestige/`-l` lines that must be ignored).
- [ ] **Step 2: Failing tests:**
  - fixture with fileName `[Level 312].txt` → `hero 'Paladin'`, `level 312`, `slotNames` has 5 entries including `Ruby` twice.
  - Review Focus #5: same fixture with `﻿` prefix and `\n`→`\r\n` → deep-equal result.
  - text with no Hero line → throws `SaveParseError`.
  - no fileName → `level null`.
  - `matchNames(['ruby', ' RUBY ', 'Death’s Edge', 'Mystery Thing'], index)` (index from a tiny dataset containing `Ruby` and `Death's Edge`) → `owned {ruby: 2, 'deaths-edge': 1}`, `unknownNames ['Mystery Thing']` (Review Focus #1 and #2).
  - alias match: item with `aliases: ['Old Ruby']` matches `Old Ruby`.
- [ ] **Step 3:** `npx vitest run src/import` → FAIL.
- [ ] **Step 4:** Implement.
- [ ] **Step 5:** `npx vitest run src/import` → PASS.
- [ ] **Step 6:** Commit `feat: save-file parser and name matching`.

---

### Task 6: Persistence and app store

**Files:**
- Create: `src/storage/types.ts`, `src/storage/repo.ts`, `src/storage/repo.test.ts`, `src/state/owned.ts`, `src/state/owned.test.ts`, `src/state/app-store.ts`, `src/state/app-store.test.ts`

**Interfaces:**
- Consumes: `parseSave`, `SaveParseError`, `matchNames` (Task 5), `dataset` (Task 2).
- Produces:
```ts
// storage/types.ts
export interface Character { id: string; className: string; level: number | null; battleTag?: string; importedAt: string; imported: Record<string, number>; unknownNames: string[]; adjustments: Record<string, number> }
export interface Build { id: string; characterId: string; name: string; goals: string[]; active: boolean }
// storage/repo.ts
export interface Repo {
  persistent: boolean
  listCharacters(): Promise<Character[]>; putCharacter(c: Character): Promise<void>; deleteCharacter(id: string): Promise<void>
  listBuilds(): Promise<Build[]>; putBuild(b: Build): Promise<void>; deleteBuild(id: string): Promise<void>
  getSetting<T>(key: string): Promise<T | undefined>; putSetting(key: string, value: unknown): Promise<void>
}
export function openRepo(): Promise<Repo>      // IndexedDB db 'tevo-build-helper' v1, stores characters/builds/settings; falls back to createMemoryRepo() if IDB open fails
export function createMemoryRepo(): Repo        // persistent: false
// state/owned.ts
export function effectiveOwned(c: Character): Map<string, number>   // imported + adjustments, clamped >= 0, zero entries dropped
// state/app-store.ts  (Zustand)
export type ImportResult = { ok: true; characterId: string; unknownCount: number; clearedAdjustments: boolean } | { ok: false; error: string }
export interface AppState {
  ready: boolean; persistent: boolean; characters: Character[]; builds: Build[]
  init(repo?: Repo): Promise<void>
  importSave(text: string, fileName: string, battleTag?: string): Promise<ImportResult>
  adjust(characterId: string, itemId: string, delta: number): Promise<void>
  deleteCharacter(id: string): Promise<void>
  createBuild(characterId: string, name: string): Promise<Build>   // first build for a character becomes active
  renameBuild(id: string, name: string): Promise<void>
  deleteBuild(id: string): Promise<void>                          // if active, another build of that character becomes active
  setActiveBuild(id: string): Promise<void>                       // deactivates the character's other builds
  setGoals(buildId: string, goals: string[]): Promise<void>
}
export const useAppStore
```
Character id = `${battleTag ?? 'local'}/${hero}`. Re-import of an existing id replaces `imported`, `unknownNames`, `level`, `importedAt`, clears `adjustments` (`clearedAdjustments` true if there were any) and keeps builds. Build ids via `crypto.randomUUID()`.

- [ ] **Step 1: Failing tests:**
  - repo (with `fake-indexeddb`): put/list/delete round-trips for characters and builds; settings get/put; memory repo has `persistent: false`.
  - owned: Review Focus #4: imported `{ruby: 1}`, adjustments `{ruby: -3, diamond: 2}` → `Map{diamond→2}`.
  - store (with `createMemoryRepo()`): `importSave(fixture, '[Level 312].txt')` → ok, character `local/Paladin` level 312; `adjust` then re-import → `clearedAdjustments: true`, adjustments empty, existing build still present; `importSave('garbage', 'x.txt')` → `{ok:false}` and characters unchanged; `createBuild` twice → only the first is active; `setActiveBuild(second)` flips; `deleteBuild(active)` makes the remaining one active.
- [ ] **Step 2:** `npx vitest run src/storage src/state` → FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** `npx vitest run src/storage src/state` → PASS.
- [ ] **Step 5:** Commit `feat: persistence and app store`.

---

### Task 7: Shell, routing and Characters screen with file import

**Files:**
- Create: `src/app/route.ts`, `src/app/route.test.ts`, `src/app/Layout.tsx`, `src/components/ItemIcon.tsx`, `src/components/rarity.ts`, `src/features/characters/CharactersPage.tsx`, `src/features/characters/DropZone.tsx`, `src/features/characters/CharactersPage.test.tsx`
- Modify: `src/App.tsx`, `src/App.test.tsx`

**Interfaces:**
- Consumes: `useAppStore` (Task 6), `planBuild` (Task 4) for the card's active-build progress, `dataset`.
- Produces: `type Route = { page: 'characters' } | { page: 'character'; id: string } | { page: 'data' }`; `parseRoute(hash: string): Route`; `toHash(r: Route): string`; `useRoute(): Route` (listens to `hashchange`); `<ItemIcon item={Item} size?={number}>` (img `./icons/<icon>` with rarity-colored border, placeholder box when no icon); `RARITY_COLORS: Record<Rarity, string>` (common `#8B8989`, uncommon `#00ff00`, rare `#009ACD`, epic `#A020F0`, legendary `#FF0000`, godly `#FFD700`, forged `#8B4513`, mythic `#EE82EE`).

Character ids contain `/`; encode with `encodeURIComponent` in hashes.

- [ ] **Step 1: Failing tests:** `parseRoute('')` and `'#/'` → characters; `parseRoute('#/character/local%2FPaladin')` → `{page:'character', id:'local/Paladin'}`; `'#/data'` → data; unknown → characters; `toHash` round-trips. Page test: after `init(createMemoryRepo())`, dropping a `File` of the fixture onto the drop zone renders a card with `Paladin` and `Lv 312`; dropping garbage shows `Couldn't read this file`; a save with unknown names shows `1 unknown item`.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement. `Layout`: header with app name, nav links Characters / Data, and the not-persistent banner (`Storage unavailable — nothing will be saved after you close this tab.`) when `persistent` is false. `App` calls `init()` once and switches on `useRoute()`. `DropZone` accepts drop + click-to-pick (`<input type="file" accept=".txt">`), calls `importSave(text, file.name)`, shows a toast-style message for errors and for `clearedAdjustments` (`Manual adjustments were cleared by this import.`). Card: class, `Lv N`, item count, active build name + progress % (mean of goal progress), unknown-item count, delete button; clicking navigates to `#/character/<id>`.
- [ ] **Step 4:** Run → PASS; `npm run build` → 0.
- [ ] **Step 5:** Commit `feat: characters screen with save import`.

---

### Task 8: Folder import (Chrome/Edge)

**Files:**
- Create: `src/import/folder.ts`, `src/import/folder.test.ts`, `src/features/characters/FolderImport.tsx`
- Modify: `src/features/characters/CharactersPage.tsx`

**Interfaces:**
- Consumes: `importSave` (Task 6), `Repo.getSetting/putSetting` key `'saveFolder'` (exposed via two new store actions `getSaveFolder(): Promise<FileSystemDirectoryHandle | undefined>` and `setSaveFolder(h: FileSystemDirectoryHandle): Promise<void>`).
- Produces: `interface FolderSave { battleTag: string; classFolder: string; fileName: string; text: string }`; `readSaveFolder(root: FileSystemDirectoryHandle): Promise<FolderSave[]>` — for each subdirectory (BattleTag) → each subdirectory (class) → the file whose name contains `[Level` with the greatest `lastModified`; folders without such a file are skipped. `supportsFolderPicker(): boolean` (`'showDirectoryPicker' in window`).

- [ ] **Step 1: Failing test** with hand-built fake handles (objects implementing `kind`, `name`, `values()`, `getFile()`): root with `Tag#1/Paladin/[Level 300].txt` (older) and `[Level 312].txt` (newer), `Tag#1/Empty/` and a stray root file → one `FolderSave` with `fileName '[Level 312].txt'`, `battleTag 'Tag#1'`.
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement. **Step 4:** Run → PASS.
- [ ] **Step 5:** `FolderImport` (rendered only when `supportsFolderPicker()`): "Choose save folder" (calls `showDirectoryPicker`, stores handle, imports all) and "Refresh" (re-reads the stored handle; if `queryPermission({mode:'read'})` isn't `granted`, call `requestPermission` from the click handler; on denial show `Folder access was revoked — choose the folder again.`). Each `FolderSave` → `importSave(text, fileName, battleTag)`; summary message `Imported N characters` plus failures. Hint text: `Pick the folder that contains your BattleTag folders (Documents/Warcraft III/CustomMapData/…).`
- [ ] **Step 6:** `npm run build` → 0. Commit `feat: folder import and refresh`.

---

### Task 9: Build screen — builds and goals

**Files:**
- Create: `src/features/build/BuildPage.tsx`, `src/features/build/BuildSelector.tsx`, `src/features/build/GoalsList.tsx`, `src/features/build/GoalSearch.tsx`, `src/features/build/RecipeNode.tsx`, `src/features/build/search.ts`, `src/features/build/search.test.ts`, `src/features/build/BuildPage.test.tsx`
- Modify: `src/App.tsx` (route `character` → `BuildPage`)

**Interfaces:**
- Consumes: store build actions (Task 6), `planBuild` (Task 4), `effectiveOwned` (Task 6), `ItemIcon` (Task 7), `dataset`.
- Produces: `searchItems(index: DatasetIndex, query: string, limit = 20): Item[]` — normalized substring match on name and aliases; names starting with the query rank first, then alphabetical; empty query → `[]`.

- [ ] **Step 1: Failing tests:** `searchItems` ranks `Ruby` before `Blood Ruby` for query `ru`; alias hits included; empty query → `[]`. Page test (memory repo, imported fixture): with no builds shows `Create build`; creating `Tank` then adding goal `Hyperion` via search shows a progress bar row `Hyperion` with a percentage; a build whose goals include an id missing from the dataset shows `Removed item` with a remove button.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement. Layout: header (class, `Lv N`, `BuildSelector`: select active build, create / rename / delete with confirm). Two columns on wide screens, stacked on narrow. Left: `GoalsList` sortable with `@dnd-kit/sortable` (reorder calls `setGoals`), each row = icon, name, progress bar, %, remove button; clicking a row toggles `RecipeNode` children: each input shown with qty, an `owned`/`missing` badge (owned if effective count > 0), and an expand toggle for inputs that have recipes (one level per click). Legacy items in search results tagged `legacy`. Right column placeholder for Task 10.
- [ ] **Step 4:** Run → PASS. Commit `feat: build screen with goals`.

---

### Task 10: Materials panel

**Files:**
- Create: `src/features/build/MaterialsPanel.tsx`, `src/features/build/MaterialsPanel.test.tsx`
- Modify: `src/features/build/BuildPage.tsx`

**Interfaces:**
- Consumes: `PlanResult` (Task 4), `adjust` (Task 6), `ItemIcon`.

- [ ] **Step 1: Failing tests** (render `MaterialsPanel` with a hand-built `PlanResult` + items map): "By material" tab shows `Diabolic Orb` with `need 6 · own 1 · missing 5` and breakdown lines `2 × via Hell Diamond (for Glow Orb)` and `4 × via Pre-fusion 1 (for Celestial Blade)`; breakdown entries with `parentId: null` render `goal`; rows with `missing 0` show a check mark; source tier badges (`H1`) shown next to the name. "By source" tab shows group header `Agahnim · H2` with `Ruby ×2`, and `Source unknown` last. Clicking `+` / `−` on a row calls `adjust(characterId, itemId, 1)` / `adjust(characterId, itemId, -1)`.
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement (tabs remember the last choice in `localStorage` key `materialsTab`, wrapped in try/catch). **Step 4:** Run → PASS.
- [ ] **Step 5:** Wire into `BuildPage` right column using `planBuild({items: dataset.items, owned: effectiveOwned(character), goals: activeBuild.goals})` memoized. Empty state when no goals: `Add a goal to see materials.`
- [ ] **Step 6:** `npm run build` → 0. Commit `feat: materials panel`.

---

### Task 11: Data page

**Files:**
- Create: `src/features/data/DataPage.tsx`, `src/features/data/DataPage.test.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `dataset.meta`, `useAppStore().characters`.

- [ ] **Step 1: Failing test:** renders `Map version 7.39b`, the `updatedAt` date, the EvoHelper credit link, and the union of all characters' `unknownNames` (deduped, sorted) with the character they came from; with none shows `No unknown items seen.`
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement; include `Report wrong data` link to `https://github.com/<owner>/tevo-build-helper/issues/new` (owner filled in Task 12; use a constant `REPO_URL` in `src/app/config.ts`). **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit `feat: data page`.

---

### Task 12: CI, GitHub repo and Pages deployment

**Files:**
- Create: `.github/workflows/deploy.yml`, `src/app/config.ts` (if not created in Task 11)

- [ ] **Step 1:** `deploy.yml`: on push to `main` and `workflow_dispatch`; job `build`: checkout, `actions/setup-node` (node 22, npm cache), `npm ci`, `npm run validate-data`, `npx tsc -b`, `npm test`, `npm run build`, `actions/upload-pages-artifact` (`dist`); job `deploy` (needs build, `pages: write`, `id-token: write`, environment `github-pages`): `actions/deploy-pages`.
- [ ] **Step 2:** Locally run the same sequence (`npm ci && npm run validate-data && npx tsc -b && npm test && npm run build`) → all exit 0.
- [ ] **Step 3: Ask the user to confirm** before creating anything on GitHub (public repo, outward-facing). Then: `gh repo create tevo-build-helper --public --source . --remote origin --push`, then `gh api -X POST repos/{owner}/tevo-build-helper/pages -f build_type=workflow`.
- [ ] **Step 4:** Set `REPO_URL` in `src/app/config.ts` to the created repo URL, commit `ci: deploy to GitHub Pages`, push. `gh run watch` → success. The site URL `https://<owner>.github.io/tevo-build-helper/` loads and shows the Characters screen.
