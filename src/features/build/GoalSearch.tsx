import { useState } from 'react'
import { ItemIcon } from '../../components/ItemIcon'
import { dataset } from '../../data/dataset'
import type { Item } from '../../data/types'
import { itemSources, searchItems } from './search'

const sources = itemSources(dataset)
const dungeons = sources.filter(s => s.dungeon)
const others = sources.filter(s => !s.dungeon)

export function GoalSearch({ added, onAdd }: { added: string[]; onAdd: (itemId: string) => void }) {
  const [query, setQuery] = useState('')
  const [browsing, setBrowsing] = useState('')
  const results = searchItems(dataset, query)
  const firstAddable = results.find(item => !added.includes(item.id))
  const browsed = query ? undefined : sources.find(s => s.label === browsing)
  const shown: Item[] = browsed ? browsed.items : results

  return (
    <div className="relative">
      <div className="flex gap-2">
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Escape') setQuery('')
            if (e.key === 'Enter' && firstAddable) {
              onAdd(firstAddable.id)
              setQuery('')
            }
          }}
          placeholder="Add goal…"
          className="min-w-0 flex-1 rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm outline-none focus:border-sky-500"
        />
        <select
          aria-label="Browse goals by source"
          value={browsing}
          onChange={e => {
            setBrowsing(e.target.value)
            setQuery('')
          }}
          onKeyDown={e => {
            if (e.key === 'Escape') setBrowsing('')
          }}
          className="w-40 shrink-0 rounded border border-neutral-700 bg-neutral-900 px-2 py-2 text-sm outline-none focus:border-sky-500"
        >
          <option value="">Browse…</option>
          <optgroup label="Dungeons">
            {dungeons.map(s => (
              <option key={s.label} value={s.label}>
                {s.label}
              </option>
            ))}
          </optgroup>
          <optgroup label="NPCs and other sources">
            {others.map(s => (
              <option key={s.label} value={s.label}>
                {s.label}
              </option>
            ))}
          </optgroup>
        </select>
      </div>
      {shown.length > 0 && (
        <ul className="absolute z-10 mt-1 max-h-80 w-full overflow-y-auto rounded border border-neutral-700 bg-neutral-900 shadow-lg">
          {browsed && (
            <li className="sticky top-0 flex items-center justify-between border-b border-neutral-800 bg-neutral-900 px-3 py-1.5 text-xs text-neutral-400">
              <span>{browsed.label}</span>
              <button className="hover:text-neutral-200" onClick={() => setBrowsing('')}>
                Close
              </button>
            </li>
          )}
          {shown.map(item => (
            <li key={item.id}>
              <button
                disabled={added.includes(item.id)}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-neutral-800 disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent"
                onClick={() => {
                  onAdd(item.id)
                  setQuery('')
                }}
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
