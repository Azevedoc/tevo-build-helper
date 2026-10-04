import type { Item } from '../data/types'
import { RARITY_COLORS } from './rarity'

export function ItemIcon({ item, size = 32 }: { item: Item; size?: number }) {
  const style = { width: size, height: size, borderColor: RARITY_COLORS[item.rarity] }
  if (!item.icon) return <span className="inline-block shrink-0 rounded border-2 bg-neutral-800" style={style} />
  return <img src={`./icons/${item.icon}`} alt="" className="shrink-0 rounded border-2" style={style} loading="lazy" />
}
