import { useMemo } from 'react'
import { dataset } from '../../data/dataset'
import { planBuild, type GoalResult } from '../../engine/plan'
import { useAppStore } from '../../state/app-store'
import { ownedCounts } from '../../state/owned'
import { BuildSelector } from './BuildSelector'
import { GoalSearch } from './GoalSearch'
import { GoalsList } from './GoalsList'
import { MaterialsPanel } from './MaterialsPanel'

export function BuildPage({ characterId }: { characterId: string }) {
  const character = useAppStore(s => s.characters.find(c => c.id === characterId))
  const allBuilds = useAppStore(s => s.builds)
  const setGoals = useAppStore(s => s.setGoals)
  const builds = useMemo(
    () => allBuilds.filter(b => b.characterId === characterId).sort((a, b) => a.name.localeCompare(b.name)),
    [allBuilds, characterId],
  )
  const active = builds.find(b => b.active)
  // The game allows only one of each item, so a goal appears once; this also collapses duplicates saved earlier.
  const goals = useMemo(() => [...new Set(active?.goals ?? [])], [active])
  const owned = useMemo(() => (character ? ownedCounts(character) : new Map<string, number>()), [character])
  const plan = useMemo(
    () => (active ? planBuild({ items: dataset.items, owned, goals }) : null),
    [active, goals, owned],
  )

  if (!character) return <p className="text-sm text-neutral-400">Character not found.</p>

  // planBuild skips goals missing from the dataset; re-align its results with the goal list.
  const results: (GoalResult | null)[] = []
  if (active && plan) {
    let next = 0
    for (const g of goals) results.push(dataset.items.has(g) ? plan.goals[next++] : null)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-xl font-semibold">
          {character.className}
          {character.level !== null && <span className="ml-2 text-base text-neutral-400">Lv {character.level}</span>}
        </h2>
        <BuildSelector characterId={characterId} className={character.className} builds={builds} active={active} />
      </div>

      {!active ? (
        <p className="text-sm text-neutral-400">Create a build to start planning goals for this character.</p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <section className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">Goals</h3>
            <GoalSearch
              added={goals}
              onAdd={id => {
                if (!goals.includes(id)) void setGoals(active.id, [...goals, id])
              }}
            />
            <GoalsList goals={goals} results={results} onChange={goals => void setGoals(active.id, goals)} />
          </section>
          <section className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">Materials</h3>
            {plan && plan.materials.length > 0 ? (
              <MaterialsPanel plan={plan} items={dataset.items} owned={owned} />
            ) : (
              <p className="text-sm text-neutral-400">Add a goal to see materials.</p>
            )}
          </section>
        </div>
      )}
    </div>
  )
}
