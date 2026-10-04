import { useState } from 'react'
import { ItemIcon } from '../../components/ItemIcon'
import { dataset } from '../../data/dataset'
import { searchItems } from './search'

export function GoalSearch({ onAdd }: { onAdd: (itemId: string) => void }) {
  const [query, setQuery] = useState('')
  const results = searchItems(dataset, query)

  return (
    <div className="relative">
      <input
        value={query}
        onChange={e => setQuery(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Escape') setQuery('')
          if (e.key === 'Enter' && results[0]) {
            onAdd(results[0].id)
            setQuery('')
          }
        }}
        placeholder="Add goal…"
        className="w-full rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm outline-none focus:border-sky-500"
      />
      {results.length > 0 && (
        <ul className="absolute z-10 mt-1 max-h-80 w-full overflow-y-auto rounded border border-neutral-700 bg-neutral-900 shadow-lg">
          {results.map(item => (
            <li key={item.id}>
              <button
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-neutral-800"
                onClick={() => {
                  onAdd(item.id)
                  setQuery('')
                }}
              >
                <ItemIcon item={item} size={24} />
                <span>{item.name}</span>
                {item.legacy && <span className="ml-auto text-xs text-neutral-500">legacy</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
