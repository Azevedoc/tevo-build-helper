export function ExpandButton(props: { open: boolean; name: string; onToggle: () => void; what?: string }) {
  const { open, name, onToggle, what = 'materials for' } = props
  return (
    <button
      aria-label={`${open ? 'Hide' : 'Show'} ${what} ${name}`}
      aria-expanded={open}
      className="w-4 shrink-0 text-neutral-500 hover:text-neutral-200"
      onClick={onToggle}
    >
      {open ? '▾' : '▸'}
    </button>
  )
}
