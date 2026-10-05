import { closestCenter, DndContext, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useState } from 'react'
import { ItemIcon } from '../../components/ItemIcon'
import { dataset } from '../../data/dataset'
import type { Item, Source } from '../../data/types'
import type { GoalPart, GoalResult } from '../../engine/plan'
import { ExpandButton } from './ExpandButton'

/** Current items each item is a recipe input of, by input id, sorted by name. */
const builtFrom = new Map<string, Item[]>()
for (const item of [...dataset.items.values()].sort((a, b) => a.name.localeCompare(b.name))) {
  if (item.legacy || item.name.includes('[')) continue
  for (const { item: input } of item.recipe ?? []) {
    const uses = builtFrom.get(input) ?? []
    if (!uses.includes(item)) builtFrom.set(input, [...uses, item])
  }
}

interface Props {
  goals: string[]
  results: (GoalResult | null)[] // aligned with goals; null = removed item
  onChange: (goals: string[]) => void
}

export function GoalsList({ goals, results, onChange }: Props) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))
  // Goals are unique, so the item id is a stable key.
  const keys = goals

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return
    onChange(arrayMove(goals, keys.indexOf(String(active.id)), keys.indexOf(String(over.id))))
  }

  if (goals.length === 0) return <p className="text-sm text-neutral-400">Add a goal to get started.</p>

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={keys} strategy={verticalListSortingStrategy}>
        <ul className="space-y-2">
          {goals.map((goalId, i) => (
            <GoalRow
              key={keys[i]}
              sortId={keys[i]}
              goalId={goalId}
              result={results[i]}
              onRemove={() => onChange(goals.filter((_, j) => j !== i))}
              // the upgrade takes this goal's place; drop any later copy so goals stay unique
              onReplace={next => onChange(goals.map((g, j) => (j === i ? next : g)).filter((g, j) => g !== next || j === i))}
            />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  )
}

function GoalRow(props: {
  sortId: string
  goalId: string
  result: GoalResult | null
  onRemove: () => void
  onReplace: (itemId: string) => void
}) {
  const { sortId, goalId, result, onRemove, onReplace } = props
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: sortId })
  const [open, setOpen] = useState(false)
  const item = dataset.items.get(goalId)
  const pct = result ? Math.round(result.progress * 100) : 0
  const dropsFrom = item && !item.recipe ? describeSources(item.sources) : null
  const obtained = result?.status === 'done'
  const parts = !obtained && item?.recipe ? (result?.parts ?? []) : []
  const upgrades = obtained ? (builtFrom.get(goalId) ?? []) : []

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      data-testid="goal-row"
      className="rounded border border-neutral-800 bg-neutral-900 p-2"
    >
      <div className="flex items-center gap-2">
        <span {...attributes} {...listeners} className="cursor-grab px-1 text-neutral-600" aria-label="Drag to reorder">
          ⋮⋮
        </span>
        {item ? (
          <>
            {parts.length > 0 ? (
              <ExpandButton open={open} name={item.name} onToggle={() => setOpen(!open)} />
            ) : upgrades.length > 0 ? (
              <ExpandButton open={open} name={item.name} what="items built from" onToggle={() => setOpen(!open)} />
            ) : (
              <span className="w-4" />
            )}
            <ItemIcon item={item} />
            <span className="min-w-0 flex-1 truncate text-sm">{item.name}</span>
            {obtained ? (
              <span className="text-xs font-medium text-emerald-400">Obtained</span>
            ) : dropsFrom !== null ? (
              <span title={dropsFrom} className="max-w-[45%] truncate text-xs text-neutral-400">
                {dropsFrom}
              </span>
            ) : (
              <>
                <div className="h-2 w-24 overflow-hidden rounded bg-neutral-800">
                  <div className={`h-full ${pct === 100 ? 'bg-emerald-500' : 'bg-sky-500'}`} style={{ width: `${pct}%` }} />
                </div>
                <span className="w-10 text-right text-xs tabular-nums text-neutral-300">{pct}%</span>
              </>
            )}
          </>
        ) : (
          <span className="flex-1 text-sm text-red-400">Removed item</span>
        )}
        <button
          aria-label={`Remove ${item?.name ?? goalId}`}
          className="px-1 text-neutral-500 hover:text-red-400"
          onClick={onRemove}
        >
          ×
        </button>
      </div>
      {open && parts.length > 0 && (
        <div className="mt-2 border-t border-neutral-800 pt-2 pl-6">
          <GoalParts parts={parts} />
        </div>
      )}
      {open && upgrades.length > 0 && (
        <ul className="mt-2 space-y-0.5 border-t border-neutral-800 pt-2 pl-14">
          {upgrades.map(up => (
            <li key={up.id} data-testid="goal-upgrade">
              <button
                title={`Replace ${item?.name} with ${up.name} as the next goal`}
                className="flex w-full items-center gap-2 rounded px-1 py-0.5 text-left text-sm hover:bg-neutral-800"
                onClick={() => onReplace(up.id)}
              >
                <ItemIcon item={up} size={20} />
                <span className="min-w-0 flex-1 truncate">{up.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </li>
  )
}

/** A goal's recipe inputs; an input still to be crafted expands to show its own inputs. */
function GoalParts({ parts }: { parts: GoalPart[] }) {
  return (
    <ul className="space-y-0.5">
      {parts.map(part => (
        <PartRow key={part.itemId} part={part} />
      ))}
    </ul>
  )
}

function PartRow({ part }: { part: GoalPart }) {
  const [open, setOpen] = useState(false)
  const { itemId, need, own, parts } = part
  const it = dataset.items.get(itemId)
  const name = it?.name ?? itemId
  return (
    <li>
      <div data-testid="goal-part" className="flex items-center gap-2 text-sm">
        {parts.length > 0 ? <ExpandButton open={open} name={name} onToggle={() => setOpen(!open)} /> : <span className="w-4 shrink-0" />}
        {it && <ItemIcon item={it} size={20} />}
        <span className="min-w-0 flex-1 truncate">{name}</span>
        <span className={`text-xs tabular-nums ${own >= need ? 'text-emerald-400' : 'text-neutral-400'}`}>
          {own}/{need}
        </span>
      </div>
      {open && (
        <div className="ml-2 mt-0.5 border-l border-neutral-800 pl-3">
          <GoalParts parts={parts} />
        </div>
      )}
    </li>
  )
}

function describeSources(sources: Source[]): string {
  if (sources.length === 0) return 'No known source'
  return 'Drops from ' + sources.map(s => (s.tier ? `${s.where} (${s.tier})` : s.where)).join(', ')
}
