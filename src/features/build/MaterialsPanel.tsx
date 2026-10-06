import { useState } from 'react'
import { ItemIcon } from '../../components/ItemIcon'
import type { Item } from '../../data/types'
import type { MaterialRow, PlanResult } from '../../engine/plan'
import { ExpandButton } from './ExpandButton'

interface Props {
  plan: PlanResult
  items: Map<string, Item>
  /** Everything the character owns, so a row can show what is beyond the goals' needs. */
  owned: Map<string, number>
}

// Child rows hang off a guide line under the parent's icon, which matches the goal rows' size.
const CHILDREN = 'ml-[40px] mt-0.5 space-y-0.5 border-l border-neutral-800 pl-2'
const CHILD_ROW = 'flex items-center gap-2 text-sm'

/** Materials still to farm grouped by source, then the owned ones the goals use, as owned out of needed. */
export function MaterialsPanel({ plan, items, owned }: Props) {
  const rows = new Map(plan.materials.map(m => [m.itemId, m]))
  // A goal that simply drops is already shown with its source in the goal list; list it only if other goals use it too.
  const farmed = (id: string) => rows.get(id)?.breakdown.some(b => b.parentId !== null) ?? false
  const groups = plan.bySource
    .map(group => ({ ...group, items: group.items.filter(({ itemId }) => farmed(itemId)) }))
    .filter(group => group.items.length > 0)
  const have = (row: MaterialRow) => owned.get(row.itemId) ?? row.own
  const name = (id: string) => items.get(id)?.name ?? id
  // Base items still missing are farmed; owned crafted items whose missing copies were broken down still show here.
  // Goals themselves are left out: the goal list already shows them as owned.
  const alreadyHave = plan.materials
    .filter(m => m.own > 0 && (m.missing === 0 || !m.isBase) && !m.breakdown.some(b => b.parentId === null))
    .sort((a, b) => name(a.itemId).localeCompare(name(b.itemId), undefined, { numeric: true }))

  return (
    <div className="space-y-3">
      {groups.length === 0 && <p className="text-sm text-neutral-400">Nothing left to farm.</p>}
      {groups.length > 0 && (
        <ul className="space-y-3">
          {groups.map(group => (
            <li key={`${group.where}|${group.tier ?? ''}`} data-testid="source-group" className="rounded border border-neutral-800 p-2">
              <div className="mb-1 text-sm font-semibold">
                {group.where}
                {group.tier && ` · ${group.tier}`}
              </div>
              <ul className="space-y-0.5">
                {group.items.map(({ itemId }) => {
                  const row = rows.get(itemId)
                  return row && <MaterialLine key={itemId} row={row} have={have(row)} items={items} />
                })}
              </ul>
            </li>
          ))}
        </ul>
      )}
      {alreadyHave.length > 0 && <AlreadyHave rows={alreadyHave} have={have} items={items} />}
    </div>
  )
}

function AlreadyHave(props: { rows: MaterialRow[]; have: (row: MaterialRow) => number; items: Map<string, Item> }) {
  const { rows, have, items } = props
  const [open, setOpen] = useState(false)
  return (
    <div data-testid="already-have" className="rounded border border-neutral-800 p-2">
      <button
        aria-expanded={open}
        className="flex items-center gap-2 text-sm font-semibold hover:text-neutral-100"
        onClick={() => setOpen(!open)}
      >
        <span aria-hidden className="w-4 shrink-0 text-neutral-500">{open ? '▾' : '▸'}</span>
        Already have · {rows.length}
      </button>
      {open && (
        <ul className="mt-1 space-y-0.5">
          {rows.map(row => (
            <MaterialLine key={row.itemId} row={row} have={have(row)} items={items} />
          ))}
        </ul>
      )}
    </div>
  )
}

/** A material as owned out of needed; it expands to show what uses it, and for which goal. */
function MaterialLine({ row, have, items }: { row: MaterialRow; have: number; items: Map<string, Item> }) {
  const [open, setOpen] = useState(false)
  const it = items.get(row.itemId)
  const name = it?.name ?? row.itemId
  return (
    <li>
      <div data-testid="material-row" className="flex items-center gap-2 text-sm">
        {row.breakdown.length > 0 ? (
          <ExpandButton open={open} name={name} what="uses of" onToggle={() => setOpen(!open)} />
        ) : (
          <span className="w-4 shrink-0" />
        )}
        {it && <ItemIcon item={it} />}
        <span className="min-w-0 flex-1 truncate">{name}</span>
        <span className={`text-xs tabular-nums ${have >= row.need ? 'text-emerald-400' : 'text-neutral-400'}`}>
          {have}/{row.need}
        </span>
      </div>
      {open && <Uses row={row} items={items} />}
    </li>
  )
}

function Uses({ row, items }: { row: MaterialRow; items: Map<string, Item> }) {
  return (
    <ul className={CHILDREN}>
      {row.breakdown.map(({ parentId, goalId, count }) => {
        const user = items.get(parentId ?? goalId)
        return (
          <li key={`${parentId}|${goalId}`} data-testid="material-use" className={CHILD_ROW}>
            {user && <ItemIcon item={user} size={20} />}
            <span className="min-w-0 flex-1 truncate">
              {user?.name ?? parentId ?? goalId}
              {parentId !== null && parentId !== goalId && (
                <span className="ml-1 text-neutral-500">→ {items.get(goalId)?.name ?? goalId}</span>
              )}
            </span>
            <span className="text-xs tabular-nums text-neutral-400">×{count}</span>
          </li>
        )
      })}
    </ul>
  )
}
