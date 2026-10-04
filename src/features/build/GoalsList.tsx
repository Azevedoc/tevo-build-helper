import { closestCenter, DndContext, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useState } from 'react'
import { ItemIcon } from '../../components/ItemIcon'
import { dataset } from '../../data/dataset'
import type { GoalResult } from '../../engine/plan'
import { RecipeChildren } from './RecipeNode'

interface Props {
  goals: string[]
  results: (GoalResult | null)[] // aligned with goals; null = removed item
  owned: Map<string, number>
  onChange: (goals: string[]) => void
}

export function GoalsList({ goals, results, owned, onChange }: Props) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))
  const keys = goals.map((g, i) => `${i}:${g}`)

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
              owned={owned}
              onRemove={() => onChange(goals.filter((_, j) => j !== i))}
            />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  )
}

function GoalRow(props: { sortId: string; goalId: string; result: GoalResult | null; owned: Map<string, number>; onRemove: () => void }) {
  const { sortId, goalId, result, owned, onRemove } = props
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: sortId })
  const [open, setOpen] = useState(false)
  const item = dataset.items.get(goalId)
  const pct = result ? Math.round(result.progress * 100) : 0

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
            <ItemIcon item={item} />
            <button className="min-w-0 flex-1 truncate text-left text-sm hover:underline" onClick={() => setOpen(!open)}>
              {item.name}
            </button>
            <div className="h-2 w-24 overflow-hidden rounded bg-neutral-800">
              <div className={`h-full ${result?.status === 'done' ? 'bg-emerald-500' : 'bg-sky-500'}`} style={{ width: `${pct}%` }} />
            </div>
            <span className="w-10 text-right text-xs tabular-nums text-neutral-300">{pct}%</span>
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
      {open && item && <RecipeChildren itemId={goalId} owned={owned} />}
    </li>
  )
}
