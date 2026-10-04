import { useState } from 'react'
import { ItemIcon } from '../../components/ItemIcon'
import type { Item } from '../../data/types'
import type { MaterialRow, PlanResult } from '../../engine/plan'

type Tab = 'material' | 'source'
const TAB_KEY = 'materialsTab'

const readTab = (): Tab => {
  try {
    return localStorage.getItem(TAB_KEY) === 'source' ? 'source' : 'material'
  } catch {
    return 'material'
  }
}

interface Props {
  plan: PlanResult
  items: Map<string, Item>
  onAdjust: (itemId: string, delta: number) => void
}

export function MaterialsPanel({ plan, items, onAdjust }: Props) {
  const [tab, setTabState] = useState<Tab>(readTab)
  const setTab = (t: Tab) => {
    setTabState(t)
    try {
      localStorage.setItem(TAB_KEY, t)
    } catch {
      // storage unavailable: the choice just isn't remembered
    }
  }
  const nameOf = (id: string | null) => (id ? (items.get(id)?.name ?? id) : '')

  return (
    <div className="space-y-3">
      <div role="tablist" className="flex gap-1 border-b border-neutral-800 text-sm">
        {(['material', 'source'] as const).map(t => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`-mb-px border-b-2 px-3 py-1.5 ${tab === t ? 'border-sky-500 text-neutral-100' : 'border-transparent text-neutral-400 hover:text-neutral-200'}`}
          >
            {t === 'material' ? 'By material' : 'By source'}
          </button>
        ))}
      </div>

      {tab === 'material' ? (
        <ul className="space-y-1">
          {plan.materials.map(row => (
            <MaterialRowView key={row.itemId} row={row} item={items.get(row.itemId)} nameOf={nameOf} onAdjust={onAdjust} />
          ))}
        </ul>
      ) : plan.bySource.length === 0 ? (
        <p className="text-sm text-neutral-400">Nothing left to farm.</p>
      ) : (
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
                      <span>
                        {nameOf(itemId)} ×{missing}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function MaterialRowView(props: {
  row: MaterialRow
  item?: Item
  nameOf: (id: string | null) => string
  onAdjust: (itemId: string, delta: number) => void
}) {
  const { row, item, nameOf, onAdjust } = props
  const name = nameOf(row.itemId)
  const tiers = [...new Set((item?.sources ?? []).map(s => s.tier).filter(Boolean))]

  return (
    <li data-testid={`material-${row.itemId}`} className="rounded bg-neutral-900 px-2 py-1.5">
      <div className="flex items-center gap-2 text-sm">
        {item && <ItemIcon item={item} size={24} />}
        <span className="min-w-0 truncate">
          {name}
        </span>
        {tiers.map(t => (
          <span key={t} className="rounded bg-sky-950 px-1.5 text-xs text-sky-300">
            {t}
          </span>
        ))}
        <span className="ml-auto whitespace-nowrap text-xs tabular-nums text-neutral-400">
          need {row.need} · own {row.own} · missing {row.missing}
        </span>
        {row.missing === 0 ? <span className="w-4 text-emerald-400">✓</span> : <span className="w-4" />}
        <button aria-label={`Own one less ${name}`} className="px-1 text-neutral-500 hover:text-neutral-100" onClick={() => onAdjust(row.itemId, -1)}>
          −
        </button>
        <button aria-label={`Own one more ${name}`} className="px-1 text-neutral-500 hover:text-neutral-100" onClick={() => onAdjust(row.itemId, 1)}>
          +
        </button>
      </div>
      <ul className="ml-8 mt-1 space-y-0.5 text-xs text-neutral-400">
        {row.breakdown.map(b => (
          <li key={`${b.parentId}|${b.goalId}`}>
            {b.count} × {b.parentId ? `via ${nameOf(b.parentId)} (for ${nameOf(b.goalId)})` : `goal (${nameOf(b.goalId)})`}
          </li>
        ))}
      </ul>
    </li>
  )
}
