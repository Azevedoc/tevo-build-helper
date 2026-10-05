import { EVOHELPER_URL, REPO_URL } from '../../app/config'
import { dataset } from '../../data/dataset'
import { useAppStore } from '../../state/app-store'

export function DataPage() {
  const characters = useAppStore(s => s.characters)
  const unknown = characters
    .flatMap(c => c.unknownNames.map(name => ({ name, from: c.id })))
    .sort((a, b) => a.name.localeCompare(b.name) || a.from.localeCompare(b.from))
  const link = 'text-sky-400 hover:underline'

  return (
    <div className="max-w-2xl space-y-6 text-sm">
      <section className="space-y-1">
        <h2 className="text-xl font-semibold">Data</h2>
        <p>
          Map version {dataset.meta.mapVersion} · {dataset.items.size} items · last updated {dataset.meta.updatedAt}
        </p>
        <p className="text-neutral-400">
          Item data comes from{' '}
          <a className={link} href={EVOHELPER_URL} target="_blank" rel="noreferrer">
            EvoHelper
          </a>{' '}
          by ArgentumHeart, synced into this project when a new map version ships. Warcraft III assets belong to Blizzard Entertainment;
          map data belongs to the Twilight's Eve Evo authors. Unofficial, non-commercial community tool.
        </p>
        <p>
          <a className={link} href={`${REPO_URL}/issues/new`} target="_blank" rel="noreferrer">
            Report wrong data
          </a>{' '}
          ·{' '}
          <a className={link} href={REPO_URL} target="_blank" rel="noreferrer">
            Source code on GitHub
          </a>
        </p>
      </section>

      <section className="space-y-2">
        <h3 className="font-semibold">Unknown items in your saves</h3>
        <p className="text-neutral-400">
          Names found in imported saves that aren't in the dataset — usually a sign the map has patched. They are ignored by
          the planner.
        </p>
        {unknown.length === 0 ? (
          <p className="text-neutral-400">No unknown items seen.</p>
        ) : (
          <ul className="space-y-0.5">
            {unknown.map(u => (
              <li key={`${u.name}|${u.from}`} data-testid="unknown-item">
                {u.name} — {u.from}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
