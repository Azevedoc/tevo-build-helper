import { useAppStore } from '../../state/app-store'
import type { Build } from '../../storage/types'

export function BuildSelector({ characterId, builds, active }: { characterId: string; builds: Build[]; active?: Build }) {
  const { createBuild, renameBuild, deleteBuild, setActiveBuild } = useAppStore()

  const create = async () => {
    const name = window.prompt('Build name', `Build ${builds.length + 1}`)?.trim()
    if (!name) return
    const build = await createBuild(characterId, name)
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
    </div>
  )
}
