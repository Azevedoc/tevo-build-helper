import { wikiBuilds } from '../../data/wiki-builds'
import { useAppStore } from '../../state/app-store'
import type { Build } from '../../storage/types'

export function BuildSelector({
  characterId,
  className,
  builds,
  active,
}: {
  characterId: string
  className: string
  builds: Build[]
  active?: Build
}) {
  const { createBuild, renameBuild, deleteBuild, setActiveBuild, setGoals } = useAppStore()
  const wiki = wikiBuilds(className)

  const create = async () => {
    const name = window.prompt('Build name', `Build ${builds.length + 1}`)?.trim()
    if (!name) return
    const build = await createBuild(characterId, name)
    await setActiveBuild(build.id)
  }

  const createFromWiki = async (tier: string) => {
    const build = await createBuild(characterId, `${tier} (wiki)`)
    await setGoals(build.id, wiki[tier])
    await setActiveBuild(build.id)
  }

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      {active && (
        <>
          <select
            aria-label="Active build"
            value={active.id}
            onChange={e => void setActiveBuild(e.target.value)}
            className="rounded border border-neutral-700 bg-neutral-900 px-2 py-1"
          >
            {builds.map(b => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
          <button
            className="text-neutral-400 hover:text-neutral-100"
            onClick={() => {
              const name = window.prompt('Rename build', active.name)?.trim()
              if (name) void renameBuild(active.id, name)
            }}
          >
            Rename
          </button>
          <button
            className="text-neutral-400 hover:text-red-400"
            onClick={() => {
              if (window.confirm(`Delete build "${active.name}"?`)) void deleteBuild(active.id)
            }}
          >
            Delete
          </button>
        </>
      )}
      <button className="rounded bg-neutral-800 px-3 py-1 hover:bg-neutral-700" onClick={create}>
        {active ? 'New build' : 'Create build'}
      </button>
      {Object.keys(wiki).length > 0 && (
        <select
          aria-label="Start from wiki build"
          title="New build with the items the Twilight's Eve Evo wiki recommends for this class"
          value=""
          onChange={e => void createFromWiki(e.target.value)}
          className="rounded border border-neutral-700 bg-neutral-900 px-2 py-1"
        >
          <option value="" disabled>
            From wiki…
          </option>
          {Object.keys(wiki).map(tier => (
            <option key={tier} value={tier}>
              {tier}
            </option>
          ))}
        </select>
      )}
    </div>
  )
}
