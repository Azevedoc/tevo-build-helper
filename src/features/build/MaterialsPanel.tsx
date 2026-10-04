import { useState } from 'react'
import { ItemIcon } from '../../components/ItemIcon'
import type { Item } from '../../data/types'
import type { PlanResult } from '../../engine/plan'

interface Props {
  plan: PlanResult
  items: Map<string, Item>
  /** Everything the character owns, so the owned view can show what is beyond the goals' needs. */
  owned: Map<string, number>
}

type Tab = 'farm' | 'owned'

export function MaterialsPanel({ plan, items, owned }: Props) {
  const [tab, setTab] = useState<Tab>('farm')
  const tabClass = (t: Tab) =>
    `rounded px-2 py-0.5 text-sm ${tab === t ? 'bg-neutral-700 text-neutral-100' : 'text-neutral-400 hover:text-neutral-100'}`

  return (
    <div className="space-y-2">
      <div role="tablist" className="flex gap-1">
        <button role="tab" aria-selected={tab === 'farm'} className={tabClass('farm')} onClick={() => setTab('farm')}>
          To farm
        </button>
        <button role="tab" aria-selected={tab === 'owned'} className={tabClass('owned')} onClick={() => setTab('owned')}>
          Owned
        </button>
      </div>
      {tab === 'farm' ? <ToFarm plan={plan} items={items} /> : <OwnedView plan={plan} items={items} owned={owned} />}
    </div>
  )
}

function ToFarm({ plan, items }: Omit<Props, 'owned'>) {
  if (plan.bySource.length === 0) return <p className="text-sm text-neutral-400">Nothing left to farm.</p>

  return (
    <ul className="space-y-3">
      {plan.bySource.map(group => (
        <li key={`${group.where}|${group.tier ?? ''}`} data-testid="source-group" className="rounded border border-neutral-800 p-2">
          <div className="mb-1 text-sm font-semibold">
            {group.where}
            {group.tier && ` · ${group.tier}`}
          </div>
          <ul className="space-y-0.5">
            {group.items.map(({ itemId, missing }) => {
              const it = items.get(itemId)
              return (
                <li key={itemId} className="flex items-center gap-2 text-sm">
                  {it && <ItemIcon item={it} size={20} />}
                  <span className="min-w-0 truncate">
                    {it?.name ?? itemId} ×{missing}
                  </span>
                </li>
              )
            })}
          </ul>
        </li>
      ))}
    </ul>
  )
}

/** Owned items the goals consume: how many are used, and how many are owned when that is more. */
function OwnedView({ plan, items, owned }: Props) {
  const name = (id: string) => items.get(id)?.name ?? id
  const used = plan.materials
    .filter(m => m.own > 0)
    .sort((a, b) => name(a.itemId).localeCompare(name(b.itemId), undefined, { numeric: true }))
  if (used.length === 0) return <p className="text-sm text-neutral-400">Nothing you own is used by these goals yet.</p>

  return (
    <ul className="space-y-0.5">
      {used.map(({ itemId, own }) => {
        const it = items.get(itemId)
        const total = owned.get(itemId) ?? own
        return (
          <li key={itemId} data-testid="owned-row" className="flex items-center gap-2 text-sm">
            {it && <ItemIcon item={it} size={20} />}
            <span className="min-w-0 truncate">
              {name(itemId)} ×{own}
            </span>
            {total > own && <span className="ml-auto shrink-0 text-xs text-neutral-500">of {total} owned</span>}
          </li>
        )
      })}
    </ul>
  )
}
