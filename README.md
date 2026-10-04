# TEvo Build Helper

A browser-based item build planner for the Warcraft III custom map **Twilight's Eve Evo**. Import your
character's save file, pick goal items, and see your progress and what you still need to farm, grouped by
where it drops.

## Development

Requires Node 22+.

```sh
npm install
npm run dev     # local dev server
npm test        # unit tests
npm run build   # static build into dist/
```

## Updating item data

Item data (`data/items.json`, `data/classes.json`, `public/icons/`) comes from EvoHelper's public API. When a
new map version ships, run:

```sh
npm run sync           # one request to the API; or: npm run sync -- saved-sync.json
npm run validate-data  # references, cycles, names, icons and wiki build items
```

Review the printed report (added, removed and changed items) and the git diff, then commit. Don't edit
`data/items.json` by hand: the next sync would overwrite it. Put corrections in `scripts/sync/convert.ts`
instead. The sync is never run by CI or the app.

## License

AGPL-3.0. The third-party notices below are also kept in `THIRD-PARTY-NOTICES.md`.

## Third-party notices

TEvo Build Helper's own code is licensed under the GNU Affero General Public License v3.0 (see `LICENSE`).
The material below is not covered by that license and keeps its own terms.

### Item data

The item dataset in `data/items.json`, the class list in `data/classes.json` and the icons in `public/icons/` come from
[EvoHelper](https://codeberg.org/ArgentumHeart/EvoHelper) by ArgentumHeart, via its public API
(currently map 7.39b). Thank you! They are synced by hand with `npm run sync` when a new map version ships;
the app itself never calls the API.
No EvoHelper code is included in this project.

### Wiki builds

The recommended Imp 1-3 items per 4th class in `data/wiki-builds.json` were copied once from the
[Twilight's Eve Evo Wiki](https://twilights-eve-evo.fandom.com/) (its `Module:BuildRecommendations` pages,
2026-10-04), contributed by the wiki's editors and licensed under
[CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/). The app does not contact the wiki.

### Twilight's Eve Evo and Warcraft III

Item names, descriptions, icons and other game facts come from Twilight's Eve Evo, a custom map for
Warcraft III. Warcraft III and its associated names and assets are the property of Blizzard Entertainment, Inc.
The map and its data are the property of their respective authors.

This is an unofficial, non-commercial community tool. No affiliation with or endorsement by Blizzard
Entertainment, the map's authors or the EvoHelper author is claimed or implied.
