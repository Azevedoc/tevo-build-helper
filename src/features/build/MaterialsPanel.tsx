import { useState } from 'react'
import { ItemIcon } from '../../components/ItemIcon'
import type { Item } from '../../data/types'
import type { MaterialRow, PlanResult } from '../../engine/plan'
import { ExpandButton } from './ExpandButton'

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
  const rows = new Map(plan.materials.map(m => [m.itemId, m]))
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
            {group.items.map(({ itemId, missing }) => (
              <FarmRow key={itemId} itemId={itemId} missing={missing} row={rows.get(itemId)} items={items} />
            ))}
          </ul>
        </li>
      ))}
    </ul>
  )
}

/** A material to farm; it expands to show which items use it, and for which goal. */
function FarmRow(props: { itemId: string; missing: number; row: MaterialRow | undefined; items: Map<string, Item> }) {
  const { itemId, missing, row, items } = props
  const [open, setOpen] = useState(false)
  const it = items.get(itemId)
  const name = it?.name ?? itemId
  const uses = row?.breakdown ?? []
  return (
    <li>
      <div className="flex items-center gap-2 text-sm">
        {uses.length > 0 ? (
          <ExpandButton open={open} name={name} what="uses of" onToggle={() => setOpen(!open)} />
        ) : (
          <span className="w-4 shrink-0" />
        )}
        {it && <ItemIcon item={it} size={20} />}
        <span className="min-w-0 truncate">
          {name} ×{missing}
        </span>
      </div>
      {open && (
        <ul className="ml-2 mt-0.5 space-y-0.5 border-l border-neutral-800 pl-3">
          {uses.map(({ parentId, goalId, count }) => {
            const user = items.get(parentId ?? goalId)
            return (
              <li key={`${parentId}|${goalId}`} data-testid="material-use" className="flex items-center gap-2 text-sm">
                {user && <ItemIcon item={user} size={20} />}
                <span className="min-w-0 flex-1 truncate">
                  {user?.name ?? parentId ?? goalId}
                  {parentId !== null && parentId !== goalId && (
                    <span className="text-neutral-500">→ {items.get(goalId)?.name ?? goalId}</span>
                  )}
                </span>
                <span className="text-xs tabular-nums text-neutral-400">×{count}</span>
              </li>
            )
          })}
        </ul>
      )}
    </li>
  )
}

/** Owned items the goals consume, as owned out of needed; a crafted item expands to show its recipe. */
function OwnedView({ plan, items, owned }: Props) {
  const name = (id: string) => items.get(id)?.name ?? id
  const used = plan.materials
    .filter(m => m.own > 0)
    .sort((a, b) => name(a.itemId).localeCompare(name(b.itemId), undefined, { numeric: true }))
  if (used.length === 0) return <p className="text-sm text-neutral-400">Nothing you own is used by these goals yet.</p>

  return (
    <ul className="space-y-0.5">
      {used.map(({ itemId, own, need }) => (
        <OwnedRow key={itemId} itemId={itemId} have={owned.get(itemId) ?? own} need={need} items={items} />
      ))}
    </ul>
  )
}

function OwnedRow({ itemId, have, need, items }: { itemId: string; have: number; need: number; items: Map<string, Item> }) {
  const [open, setOpen] = useState(false)
  const it = items.get(itemId)
  const name = it?.name ?? itemId
  return (
    <li>
      <div data-testid="owned-row" className="flex items-center gap-2 text-sm">
        {it?.recipe ? <ExpandButton open={open} name={name} onToggle={() => setOpen(!open)} /> : <span className="w-4 shrink-0" />}
        {it && <ItemIcon item={it} size={20} />}
        <span className="min-w-0 flex-1 truncate">{name}</span>
        <span className={`text-xs tabular-nums ${have >= need ? 'text-emerald-400' : 'text-neutral-400'}`}>
          {have}/{need}
        </span>
      </div>
      {open && it?.recipe && <RecipeParts recipe={it.recipe} items={items} />}
    </li>
  )
}

/** An item's recipe; a crafted input expands to show its own recipe. */
function RecipeParts({ recipe, items }: { recipe: NonNullable<Item['recipe']>; items: Map<string, Item> }) {
  return (
    <ul className="ml-2 mt-0.5 space-y-0.5 border-l border-neutral-800 pl-3">
      {recipe.map(({ item, qty }) => (
        <RecipePart key={item} itemId={item} qty={qty} items={items} />
      ))}
    </ul>
  )
}

function RecipePart({ itemId, qty, items }: { itemId: string; qty: number; items: Map<string, Item> }) {
  const [open, setOpen] = useState(false)
  const it = items.get(itemId)
  const name = it?.name ?? itemId
  return (
    <li>
      <div data-testid="recipe-part" className="flex items-center gap-2 text-sm">
        {it?.recipe ? <ExpandButton open={open} name={name} onToggle={() => setOpen(!open)} /> : <span className="w-4 shrink-0" />}
        {it && <ItemIcon item={it} size={20} />}
        <span className="min-w-0 flex-1 truncate">{name}</span>
        <span className="text-xs tabular-nums text-neutral-400">×{qty}</span>
      </div>
      {open && it?.recipe && <RecipeParts recipe={it.recipe} items={items} />}
    </li>
  )
}
