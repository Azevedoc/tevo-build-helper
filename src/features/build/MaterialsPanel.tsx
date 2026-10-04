import { ItemIcon } from '../../components/ItemIcon'
import type { Item } from '../../data/types'
import type { PlanResult } from '../../engine/plan'

interface Props {
  plan: PlanResult
  items: Map<string, Item>
  /** Effective owned counts (what the player has, not what the plan consumes). */
  owned: Map<string, number>
  onAdjust: (itemId: string, delta: number) => void
}

export function MaterialsPanel({ plan, items, owned, onAdjust }: Props) {
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
              const name = it?.name ?? itemId
              return (
                <li key={itemId} className="flex items-center gap-2 text-sm">
                  {it && <ItemIcon item={it} size={20} />}
                  <span className="min-w-0 truncate">
                    {name} ×{missing}
                  </span>
                  <button
                    aria-label={`Own one less ${name}`}
                    disabled={(owned.get(itemId) ?? 0) === 0}
                    className="ml-auto px-1 text-neutral-500 hover:text-neutral-100 disabled:opacity-30"
                    onClick={() => onAdjust(itemId, -1)}
                  >
                    −
                  </button>
                  <button aria-label={`Own one more ${name}`} className="px-1 text-neutral-500 hover:text-neutral-100" onClick={() => onAdjust(itemId, 1)}>
                    +
                  </button>
                </li>
              )
            })}
          </ul>
        </li>
      ))}
    </ul>
  )
}
