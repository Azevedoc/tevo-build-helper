import { useMemo, useState } from 'react'
import { toHash } from '../../app/route'
import { isFourthClass } from '../../data/classes'
import { dataset } from '../../data/dataset'
import { planBuild } from '../../engine/plan'
import { useAppStore } from '../../state/app-store'
import { ownedCounts } from '../../state/owned'
import type { Build, Character } from '../../storage/types'
import { DropZone, type Notice } from './DropZone'
import { FolderImport } from './FolderImport'

export function CharactersPage() {
  const characters = useAppStore(s => s.characters)
  const builds = useAppStore(s => s.builds)
  const hasSaveFolder = useAppStore(s => s.hasSaveFolder)
  const onlyFourthClass = useAppStore(s => s.onlyFourthClass)
  const setOnlyFourthClass = useAppStore(s => s.setOnlyFourthClass)
  const [notice, setNotice] = useState<Notice | null>(null)
  const sorted = characters
    .filter(c => !onlyFourthClass || isFourthClass(c.className))
    .sort((a, b) => a.id.localeCompare(b.id))

  return (
    <div className="space-y-4">
      <FolderImport onNotice={setNotice} />
      {!hasSaveFolder && <DropZone onNotice={setNotice} />}
      {notice && (
        <div
          className={`rounded px-3 py-2 text-sm ${notice.kind === 'error' ? 'bg-red-950 text-red-200' : 'bg-sky-950 text-sky-200'}`}
        >
          {notice.text}
        </div>
      )}
      {characters.length > 0 && (
        <label className="flex w-fit cursor-pointer items-center gap-2 text-sm text-neutral-300">
          <input
            type="checkbox"
            className="accent-sky-600"
            checked={onlyFourthClass}
            onChange={e => void setOnlyFourthClass(e.target.checked)}
          />
          Only 4th class
        </label>
      )}
      {characters.length === 0 ? (
        <p className="text-sm text-neutral-400">No characters yet. Import a save file to get started.</p>
      ) : sorted.length === 0 ? (
        <p className="text-sm text-neutral-400">No 4th class characters yet.</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map(c => (
            <CharacterCard key={c.id} character={c} activeBuild={builds.find(b => b.characterId === c.id && b.active)} />
          ))}
        </ul>
      )}
    </div>
  )
}

function CharacterCard({ character: c, activeBuild }: { character: Character; activeBuild?: Build }) {
  const deleteCharacter = useAppStore(s => s.deleteCharacter)
  const itemCount = Object.values(c.imported).reduce((a, b) => a + b, 0)
  const progress = useMemo(() => {
    if (!activeBuild) return null
    const goals = planBuild({ items: dataset.items, owned: ownedCounts(c), goals: activeBuild.goals }).goals
    return goals.length ? goals.reduce((sum, g) => sum + g.progress, 0) / goals.length : null
  }, [c, activeBuild])

  return (
    <li className="rounded-lg border border-neutral-800 bg-neutral-900 hover:border-neutral-600">
      <a href={toHash({ page: 'character', id: c.id })} className="block p-4">
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-semibold">{c.className}</span>
          {c.level !== null && <span className="text-sm text-neutral-400">Lv {c.level}</span>}
        </div>
        {c.battleTag && <div className="text-xs text-neutral-500">{c.battleTag}</div>}
        <div className="mt-2 text-sm text-neutral-400">{itemCount} items</div>
        {activeBuild && (
          <div className="mt-1 text-sm">
            {activeBuild.name}
            {progress !== null && ` · ${Math.round(progress * 100)}%`}
          </div>
        )}
        {c.unknownNames.length > 0 && (
          <div className="mt-1 text-xs text-amber-400">
            {c.unknownNames.length} unknown item{c.unknownNames.length === 1 ? '' : 's'}
          </div>
        )}
      </a>
      <div className="border-t border-neutral-800 px-4 py-2 text-right">
        <button
          className="text-xs text-neutral-500 hover:text-red-400"
          onClick={() => {
            if (confirm(`Delete ${c.className} and its builds?`)) void deleteCharacter(c.id)
          }}
        >
          Delete
        </button>
      </div>
    </li>
  )
}
