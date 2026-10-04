import { useEffect, useState } from 'react'
import { ensureReadPermission, readSaveFolder, supportsFolderPicker } from '../../import/folder'
import { useAppStore } from '../../state/app-store'
import type { Notice } from './DropZone'

export function FolderImport({ onNotice }: { onNotice: (n: Notice) => void }) {
  const { importSave, getSaveFolder, setSaveFolder } = useAppStore()
  const [folder, setFolder] = useState<FileSystemDirectoryHandle | undefined>()
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    void getSaveFolder().then(setFolder)
  }, [getSaveFolder])

  if (!supportsFolderPicker()) return null

  const importAll = async (handle: FileSystemDirectoryHandle) => {
    setBusy(true)
    try {
      const saves = await readSaveFolder(handle)
      const failures: string[] = []
      let cleared = 0
      for (const s of saves) {
        const r = await importSave(s.text, s.fileName, s.battleTag)
        if (!r.ok) failures.push(`${s.battleTag}/${s.classFolder}`)
        else if (r.clearedAdjustments) cleared++
      }
      const imported = saves.length - failures.length
      onNotice({
        kind: failures.length ? 'error' : 'info',
        text:
          `Imported ${imported} character${imported === 1 ? '' : 's'}` +
          (failures.length ? `. Couldn't read: ${failures.join(', ')}` : '') +
          (cleared ? `. Manual adjustments were cleared for ${cleared} character${cleared === 1 ? '' : 's'}.` : '') +
          (saves.length === 0 ? '. No save files found — pick the folder that contains your BattleTag folders.' : ''),
      })
    } catch {
      onNotice({ kind: 'error', text: "Couldn't read the save folder. Try choosing it again." })
    } finally {
      setBusy(false)
    }
  }

  const choose = async () => {
    try {
      const handle = await window.showDirectoryPicker!({ mode: 'read' })
      await setSaveFolder(handle)
      setFolder(handle)
      await importAll(handle)
    } catch {
      // picker cancelled
    }
  }

  const refresh = async () => {
    if (!folder) return
    if (!(await ensureReadPermission(folder))) {
      onNotice({ kind: 'error', text: 'Folder access was revoked — choose the folder again.' })
      return
    }
    await importAll(folder)
  }

  return (
    <div className="flex flex-wrap items-center gap-3 text-sm">
      <button className="rounded bg-neutral-800 px-3 py-1.5 hover:bg-neutral-700" onClick={choose} disabled={busy}>
        Choose save folder
      </button>
      {folder && (
        <button className="rounded bg-sky-800 px-3 py-1.5 hover:bg-sky-700" onClick={refresh} disabled={busy}>
          {busy ? 'Reading…' : `Refresh (${folder.name})`}
        </button>
      )}
      <span className="text-xs text-neutral-500">
        Pick the folder that contains your BattleTag folders (Documents/Warcraft III/CustomMapData/…).
      </span>
    </div>
  )
}
