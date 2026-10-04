export function ExpandButton({ open, name, onToggle }: { open: boolean; name: string; onToggle: () => void }) {
  return (
    <button
      aria-label={`${open ? 'Hide' : 'Show'} materials for ${name}`}
      aria-expanded={open}
      className="w-4 shrink-0 text-neutral-500 hover:text-neutral-200"
      onClick={onToggle}
    >
      {open ? '▾' : '▸'}
    </button>
  )
}
