import { useState } from 'react'
import { ItemIcon } from '../../components/ItemIcon'
import { dataset } from '../../data/dataset'
import { searchItems } from './search'

const allItems = [...dataset.items.values()].sort((a, b) => a.name.localeCompare(b.name))

export function GoalSearch({ added, onAdd }: { added: string[]; onAdd: (itemId: string) => void }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const results = query.trim() ? searchItems(dataset, query) : open ? allItems : []
  const firstAddable = results.find(item => !added.includes(item.id))
  const add = (itemId: string) => {
    onAdd(itemId)
    setQuery('')
    setOpen(false)
  }

  return (
    <div className="relative">
      <input
        value={query}
        onChange={e => setQuery(e.target.value)}
        onFocus={() => setOpen(true)}
        onClick={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={e => {
          if (e.key === 'Escape') {
            setQuery('')
            setOpen(false)
          }
          if (e.key === 'Enter' && query.trim() && firstAddable) add(firstAddable.id)
        }}
        placeholder="Add goal…"
        className="w-full rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm outline-none focus:border-sky-500"
      />
      {results.length > 0 && (
        // preventDefault keeps focus in the input so the list isn't closed by blur before the click lands
        <ul
          aria-label="Goal suggestions"
          onMouseDown={e => e.preventDefault()}
          className="absolute z-10 mt-1 max-h-80 w-full overflow-y-auto rounded border border-neutral-700 bg-neutral-900 shadow-lg"
        >
          {results.map(item => (
            <li key={item.id}>
              <button
                disabled={added.includes(item.id)}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-neutral-800 disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent"
                onClick={() => add(item.id)}
              >
                <ItemIcon item={item} size={24} />
                <span>{item.name}</span>
                {added.includes(item.id) ? (
                  <span className="ml-auto text-xs text-neutral-500">in build</span>
                ) : (
                  item.legacy && <span className="ml-auto text-xs text-neutral-500">legacy</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
