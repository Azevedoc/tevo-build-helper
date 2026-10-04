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

AGPL-3.0. See `THIRD-PARTY-NOTICES.md` for data credits.
