# TEvo Build Helper

A browser-based item build planner for the Warcraft III custom map **Twilight's Eve Evo**. Import your
character's save file, pick goal items, and see your progress and the total materials you still need, with a
breakdown of why each one is needed and where it drops.

## Development

Requires Node 22+.

```sh
npm install
npm run dev     # local dev server
npm test        # unit tests
npm run build   # static build into dist/
```

## Updating item data

The dataset lives in `data/items.json` (icons in `public/icons/`). Edit it, then run `npm run validate-data`
to check references, cycles and names before committing. CI runs the same check.

## License

AGPL-3.0. The third-party notices below are also kept in `THIRD-PARTY-NOTICES.md`.

## Third-party notices

TEvo Build Helper's own code is licensed under the GNU Affero General Public License v3.0 (see `LICENSE`).
The material below is not covered by that license and keeps its own terms.

### Item data

The item dataset in `data/items.json` and the icons in `public/icons/` were seeded once from
[EvoHelper](https://codeberg.org/ArgentumHeart/EvoHelper) by ArgentumHeart, via its public API
(map 7.39b, 2026-10-04). Thank you! Since then the dataset has been maintained independently in this repository.
No EvoHelper code is included in this project.

### Twilight's Eve Evo and Warcraft III

Item names, descriptions, icons and other game facts come from Twilight's Eve Evo, a custom map for
Warcraft III. Warcraft III and its associated names and assets are the property of Blizzard Entertainment, Inc.
The map and its data are the property of their respective authors.

This is an unofficial, non-commercial community tool. No affiliation with or endorsement by Blizzard
Entertainment, the map's authors or the EvoHelper author is claimed or implied.
