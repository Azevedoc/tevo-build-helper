import { ItemIcon } from '../../components/ItemIcon'
import type { Item } from '../../data/types'
import type { PlanResult } from '../../engine/plan'

interface Props {
  plan: PlanResult
  items: Map<string, Item>
}

export function MaterialsPanel({ plan, items }: Props) {
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
