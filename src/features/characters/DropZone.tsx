import { useRef, useState } from 'react'
import { useAppStore } from '../../state/app-store'

export type Notice = { kind: 'info' | 'error'; text: string }

export function DropZone({ onNotice }: { onNotice: (n: Notice) => void }) {
  const importSave = useAppStore(s => s.importSave)
  const input = useRef<HTMLInputElement>(null)
  const [over, setOver] = useState(false)

  const handleFiles = async (files: FileList | File[] | null) => {
    for (const file of Array.from(files ?? [])) {
      const result = await importSave(await file.text(), file.name)
      if (!result.ok) onNotice({ kind: 'error', text: `${result.error}: ${file.name}` })
    }
  }

  return (
    <div
      data-testid="drop-zone"
      role="button"
      tabIndex={0}
      onClick={() => input.current?.click()}
      onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && input.current?.click()}
      onDragOver={e => {
        e.preventDefault()
        setOver(true)
      }}
      onDragLeave={() => setOver(false)}
      onDrop={e => {
        e.preventDefault()
        setOver(false)
        void handleFiles(e.dataTransfer.files)
      }}
      className={`cursor-pointer rounded-lg border-2 border-dashed p-6 text-center text-sm ${
        over ? 'border-sky-400 bg-sky-950/40' : 'border-neutral-700 hover:border-neutral-500'
      }`}
    >
      Drop a save file here (<code>[Level N].txt</code>) or click to choose one.
      <input
        ref={input}
        type="file"
        accept=".txt"
        multiple
        hidden
        onChange={e => {
          void handleFiles(e.target.files)
          e.target.value = ''
        }}
      />
    </div>
  )
}
