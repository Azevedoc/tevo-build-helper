import { useState } from 'react'
import { createPortal } from 'react-dom'
import type { Item } from '../data/types'
import { RARITY_COLORS } from './rarity'

export function ItemIcon({ item, size = 32 }: { item: Item; size?: number }) {
  const [anchor, setAnchor] = useState<DOMRect | null>(null)
  const style = { width: size, height: size, borderColor: RARITY_COLORS[item.rarity] }
  return (
    <span
      className="inline-flex shrink-0"
      onMouseEnter={e => setAnchor(e.currentTarget.getBoundingClientRect())}
      onMouseLeave={() => setAnchor(null)}
    >
      {item.icon ? (
        <img src={`./icons/${item.icon}`} alt="" className="shrink-0 rounded border-2" style={style} loading="lazy" />
      ) : (
        <span className="inline-block shrink-0 rounded border-2 bg-neutral-800" style={style} />
      )}
      {anchor && createPortal(<ItemTooltip item={item} anchor={anchor} />, document.body)}
    </span>
  )
}

const WIDTH = 320

/** The item's in-game tooltip, beside the hovered icon and kept on screen. */
export function ItemTooltip({ item, anchor }: { item: Item; anchor: DOMRect }) {
  const left = Math.max(8, Math.min(anchor.right + 8, window.innerWidth - WIDTH - 8))
  // below the icon in the lower half of the screen would run off it, so open upwards there
  const below = anchor.top < window.innerHeight / 2
  const position = below ? { top: anchor.top } : { bottom: window.innerHeight - anchor.bottom }
  return (
    <div
      role="tooltip"
      className="pointer-events-none fixed z-50 space-y-1.5 rounded border border-neutral-600 bg-neutral-950/95 p-2.5 text-xs shadow-xl"
      style={{ left, width: WIDTH, ...position }}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-semibold" style={{ color: RARITY_COLORS[item.rarity] }}>
          {item.name}
        </span>
        <span className="capitalize text-neutral-500">{item.legacy ? `${item.rarity} · legacy` : item.rarity}</span>
      </div>
      {item.effects && (
        <ul className="space-y-0.5 text-emerald-300">
          {item.effects.map(e => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}
      {item.description && <p className="italic text-neutral-400">{item.description}</p>}
    </div>
  )
}
