import { useState } from 'react'
import { ItemIcon } from '../../components/ItemIcon'
import { dataset } from '../../data/dataset'

/** Lists the direct inputs of `itemId`; inputs with their own recipe can be expanded one level at a time. */
export function RecipeChildren({ itemId, owned }: { itemId: string; owned: Map<string, number> }) {
  const recipe = dataset.items.get(itemId)?.recipe ?? []
  return (
    <ul className="ml-4 border-l border-neutral-800 pl-3">
      {recipe.map(input => (
        <RecipeNode key={input.item} itemId={input.item} qty={input.qty} owned={owned} />
      ))}
    </ul>
  )
}

function RecipeNode({ itemId, qty, owned }: { itemId: string; qty: number; owned: Map<string, number> }) {
  const [open, setOpen] = useState(false)
  const item = dataset.items.get(itemId)
  if (!item) return <li className="py-1 text-sm text-red-400">Unknown item: {itemId}</li>
  const expandable = (item.recipe?.length ?? 0) > 0
  const has = (owned.get(itemId) ?? 0) > 0

  return (
    <li className="py-0.5">
      <div className="flex items-center gap-2 text-sm">
        {expandable ? (
          <button
            aria-label={`${open ? 'Collapse' : 'Expand'} ${item.name}`}
            className="w-4 text-neutral-500 hover:text-neutral-200"
            onClick={() => setOpen(!open)}
          >
            {open ? '▾' : '▸'}
          </button>
        ) : (
          <span className="w-4" />
        )}
        <ItemIcon item={item} size={20} />
        <span>{item.name}</span>
        {qty > 1 && <span className="text-neutral-500">×{qty}</span>}
        <span className={`ml-auto text-xs ${has ? 'text-emerald-400' : 'text-neutral-500'}`}>{has ? 'owned' : 'missing'}</span>
      </div>
      {open && <RecipeChildren itemId={itemId} owned={owned} />}
    </li>
  )
}
