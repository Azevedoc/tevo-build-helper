# TEvo Build Helper — Design Spec

Date: 2026-10-04
Status: Draft, awaiting review

## 1. Purpose

A browser-based item build planner for the Warcraft III custom map **Twilight's Eve Evo** (map version 7.39b at time of writing). In this map, late-game items are forged from other items and materials, often requiring dozens of components across several recipe levels.

The tool lets a player import their character's save file, pick goal items, and see:

- how far along each goal is (progress %),
- the total materials still needed across all goals, with a breakdown of *why* each amount is needed,
- where each missing material comes from, grouped by source (farming checklist).

It is a non-commercial community tool, built and maintained by AI. It is inspired by [EvoHelper](https://codeberg.org/ArgentumHeart/EvoHelper) (AGPL-3.0) but is a separate project: no code is copied and it has no runtime dependency on EvoHelper or its API (the API is only called by a manual sync script, see below).

### Success criteria

- A player can import a save file and, within seconds, see accurate remaining materials for a multi-item build.
- Material totals are correct when goals share components and when the player already owns intermediate items.
- The dataset is maintained in this repo and can be updated by editing one JSON file, validated automatically.
- Deployed as a static site on GitHub Pages; no server to run.

### Non-goals (v1)

- Ordered progression plans or "what to farm next" recommendations (players know this).
- Class restriction filtering; forge station requirements (e.g. "Nearby Patron").
- "Craftable right now" list.
- Backlog (not v1): full recipe tree visualization, reverse lookup ("what uses X"), shareable builds, recommended builds per class, in-app data editor, standalone item library page.

## 2. Data

### 2.1 Source and provenance

The map is protected, so data cannot be extracted from it. The dataset comes from EvoHelper's public API (`https://evo-api.argentumheart.dev/sync`). `npm run sync` (`scripts/sync-from-evohelper.ts`) is run by hand when a new map version ships: it converts the payload into our own format, writes `data/items.json`, `data/classes.json` and `public/icons/`, and prints what changed; the result is reviewed and committed. Local corrections live in the converter so each sync reapplies them. The sync is not part of the build, CI or the runtime. (Changed 2026-10-04 from a one-time seed with hand curation, so the data does not need to be maintained by hand.)

Credit to EvoHelper and its author for the seed data goes in `THIRD-PARTY-NOTICES.md`, along with a notice that Warcraft III assets belong to Blizzard Entertainment and map data belongs to the map's authors.

### 2.2 Schema

`data/items.json`:

```ts
interface Dataset {
  mapVersion: string;          // "7.39b"
  updatedAt: string;           // ISO date of last data edit
  seededFrom: string;          // "EvoHelper API sync, map 7.39b, 2026-10-04"
  items: Item[];               // sorted by id
}

interface Item {
  id: string;                  // stable kebab-case slug, e.g. "glow-orb"; referenced by recipes and saved builds
  name: string;                // exact in-game name as it appears in save files
  aliases?: string[];          // previous names, so renamed items still match imports
  rarity: Rarity;              // "common" | "uncommon" | "rare" | "epic" | "legendary" | "godly" | "forged" | "mythic"
  description?: string;
  effects?: string[];
  icon?: string;               // filename in public/icons/, e.g. "glow-orb.png"
  legacy?: boolean;            // no longer obtainable; still matched on import, tagged in goal search
  sources: Source[];           // where it drops / is bought; may be empty (unknown)
  recipe?: RecipeInput[];      // absent or empty = base material
}

interface Source {
  where: string;               // e.g. "Agahnim", "Dragon Fortress", "Blacksmith"
  tier?: string;               // e.g. "H2", "M1", "Imp 3"
}

interface RecipeInput {
  item: string;                // Item.id
  qty: number;                 // >= 1
}
```

Crafting semantics (confirmed): forging consumes all recipe inputs and produces exactly one output item.

### 2.3 Validation

`scripts/validate-data.ts`, run in CI and before build:

- every `recipe[].item` refers to an existing item id;
- no recipe cycles;
- `id`s unique; `name`s and `aliases` unique across all items (case-insensitive);
- `rarity` is a known value; `qty` is a positive integer;
- every `icon` file exists.

## 3. Save-file import

### 3.1 Format

Save files are plain text JASS preload files located at
`Documents/Warcraft III/CustomMapData/<map folder>/<BattleTag>/<Class>/[Level N].txt`.

Relevant lines:

```
call Preload( "Hero: <class name>" )
call Preload( "Item 1: <item name>" )            ... Item 6
call Preload( "Stash Item 1: <item name>" )      ... Stash Item 6
call Preload( "Stash2 Item 1: <item name>" )     ... up to Stash6 Item 6
```

Empty slots appear as `Item N: ` with no name. The character's level is taken from the filename (`[Level 312].txt`). Other fields (gold, shards, prestige, load code) are ignored in v1.

### 3.2 Import methods

- **Drag-and-drop / file picker** of a single `.txt` (all browsers).
- **Folder pick** (Chrome/Edge, File System Access API): the user selects the `CustomMapData` map folder once; the app lists BattleTags → classes and reads the most recently modified `[Level N].txt` in each class folder. The directory handle is persisted in IndexedDB; a "Refresh" button re-reads. If permission has lapsed, the app prompts to re-grant. The button is hidden in browsers without the API.

### 3.3 Owned items

A character's owned items = multiset of all non-empty inventory and stash slot names, matched to dataset items by `name` or `aliases` (case-insensitive, trimmed). Unmatched names are recorded as **unknown items**: shown on the character and on the Data page, and otherwise ignored by the planner.

Manual adjustments (fallback when no save is available, or between imports): +/− per item. Re-importing a save replaces the imported multiset and clears manual adjustments, with a notice.

## 4. Planner engine

Pure TypeScript module (`src/engine/`), no UI dependencies.

### 4.1 Inputs

- `dataset` (items by id)
- `owned: Map<itemId, count>` (imported + manual adjustments)
- `goals: itemId[]` (ordered; order only decides which goal an owned item counts toward)

### 4.2 Algorithm

A single shared pool (copy of `owned`). For each goal in order, expand top-down:

```
need(item, parentId, goalId):
  if pool[item] > 0:  pool[item] -= 1; record owned-coverage; return
  if item has recipe: for each input: repeat qty times: need(input, item, goalId)
  else:               record missing base material (item, parentId, goalId)
```

The goal item itself is checked against the pool first, so an already-owned goal is complete and its components are not counted.

### 4.3 Outputs

- **Per goal:** status (`done` / `in-progress` / `not-started`) and **progress %** = covered base-material units ÷ total base-material units in the goal's fully expanded tree. An owned intermediate counts as all leaf units beneath it, so crafting never decreases progress.
- **Material totals** (across all goals), for each item encountered: `need`, `own` (consumed from pool), `missing`, plus a **breakdown** by direct parent and goal, e.g.:

  ```
  Diabolic Orb   need 6 · own 1 · missing 5   [H1]
    ├ 2 × via Hell Diamond   (for Glow Orb)
    └ 4 × via Pre-fusion 1   (for Celestial Blade)
  ```

  Totals cover base materials and intermediates, so the player can see intermediate counts as well. For an intermediate, `need` = times it was required, `own` = times it was satisfied from the pool, and `missing` = times it must be forged (its inputs then appear in their own rows).
- **By source:** missing base materials grouped by `Source.where` (+ tier), sorted by source name then tier. Items with no sources are grouped under "Source unknown".

## 5. UI

Three screens, hash-based navigation (no router library).

1. **Characters** (home): import controls (drop zone, folder pick, refresh); character cards showing class, level, item count, active build progress, unknown-item warning.
2. **Build** (per character): build selector (multiple named builds per character, one active; create/rename/delete).
   - Left: goals list with progress bars, drag-to-reorder, "add goal" search over all items (name + aliases, fuzzy). Clicking a goal expands its recipe one level at a time, with each input marked owned/missing.
   - Right: materials panel with two tabs: **By material** (totals with breakdown) and **By source** (farming checklist). Each material row has +/− for manual adjustments.
3. **Data**: map version, `updatedAt`, credits, list of unknown item names seen in imports, link to report wrong data (GitHub issue).

Item icons and rarity colors shown wherever items appear. Dark theme by default (matches game/EvoHelper feel).

## 6. Persistence

IndexedDB (via `idb`):

- `characters`: `{ id (battleTag/class or file name), className, level, battleTag?, importedAt, imported: Record<itemId, count>, unknownNames: string[], adjustments: Record<itemId, number> }`
- `builds`: `{ id, characterId, name, goals: itemId[], active: boolean }`
- `settings`: directory handle, UI prefs.

If IndexedDB is unavailable (e.g. some private modes), the app works for the session and shows a banner that nothing will be saved.

## 7. Error handling

- Unparseable file (no `Hero:` preload line found): "couldn't read this file", previous data kept. Other unrecognized lines are ignored.
- Unknown item names: listed, never fatal.
- Folder API unsupported: folder option hidden; drag-and-drop still available.
- Permission lost on stored folder handle: prompt to re-grant.
- Saved build references an item id no longer in the dataset: show it as "removed item" in the goals list with a remove button; excluded from calculations.

## 8. Tech stack and structure

Chosen for rapid deployment and ease of AI-driven maintenance: strong typing as a guardrail, mainstream libraries, static output.

- Vite + React + TypeScript (strict), Tailwind CSS, Zustand (state), `idb` (IndexedDB), Vitest (+ Testing Library for light component tests). Node 22+ for development.

```
data/items.json
public/icons/                    # item icons, served as static files
scripts/sync-from-evohelper.ts   # manual, per map version
scripts/validate-data.ts
src/engine/                      # planner (§4)
src/import/                      # save parser + folder reader (§3)
src/storage/                     # IndexedDB access (§6)
src/features/characters/, src/features/build/, src/features/data/
LICENSE                          # AGPL-3.0
THIRD-PARTY-NOTICES.md
.github/workflows/deploy.yml     # validate → test → build → GitHub Pages
```

`EvoHelper/` (reference clone) is git-ignored and not part of the project.

## 9. Testing

- **Engine:** unit tests on small hand-built datasets: shared consumption across goals, owned intermediates cutting subtrees, owned goal = done, progress math, breakdown attribution, quantities > 1. One snapshot test on a real item (Hyperion) from the seeded dataset.
- **Import:** parser tests with fixture save files (inventory, multiple stashes, empty slots, malformed lines, aliases, unknown names).
- **Data:** validation script in CI.
- **UI:** light component tests for the build screen; no E2E in v1.

## 10. Deployment

GitHub Actions on push to `main`: install → validate data → typecheck → test → build → publish to GitHub Pages. Data updates follow the same path (edit `items.json`, push).
