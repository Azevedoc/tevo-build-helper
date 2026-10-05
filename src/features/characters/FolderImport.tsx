import { useEffect, useState } from 'react'
import { ensureReadPermission, readSaveFiles, readSaveFolder, supportsFolderPicker, type FolderSave } from '../../import/folder'
import { importSaves } from '../../import/sync'
import { useAppStore } from '../../state/app-store'
import type { Notice } from './DropZone'

const HINT = "Pick your map data folder, usually C:\\Users\\<user>\\Documents\\Warcraft III\\CustomMapData\\Twilight's Eve Evo."

type ImportAll = (read: () => Promise<FolderSave[]>) => Promise<void>

export function FolderImport({ onNotice }: { onNotice: (n: Notice) => void }) {
  const [busy, setBusy] = useState(false)

  const importAll: ImportAll = async read => {
    setBusy(true)
    try {
      const saves = await read()
      const { imported, failures } = await importSaves(saves)
      onNotice({
        kind: failures.length ? 'error' : 'info',
        text:
          `Imported ${imported} character${imported === 1 ? '' : 's'}` +
          (failures.length ? `. Couldn't read: ${failures.join(', ')}` : '') +
          (saves.length === 0 ? '. No save files found — pick the folder that contains your BattleTag folders.' : ''),
      })
    } catch {
      onNotice({ kind: 'error', text: "Couldn't read the save folder. Try choosing it again." })
    } finally {
      setBusy(false)
    }
  }

  return supportsFolderPicker() ? (
    <PickedFolder busy={busy} importAll={importAll} onNotice={onNotice} />
  ) : (
    <UploadedFolder busy={busy} importAll={importAll} />
  )
}

/** Chrome and Edge keep the folder, so it can be re-read without choosing it again. */
function PickedFolder({ busy, importAll, onNotice }: { busy: boolean; importAll: ImportAll; onNotice: (n: Notice) => void }) {
  const { getSaveFolder, setSaveFolder } = useAppStore()
  const [folder, setFolder] = useState<FileSystemDirectoryHandle | undefined>()

  useEffect(() => {
    void getSaveFolder().then(setFolder)
  }, [getSaveFolder])

  const choose = async () => {
    try {
      const handle = await window.showDirectoryPicker!({ mode: 'read' })
      await setSaveFolder(handle)
      setFolder(handle)
      await importAll(() => readSaveFolder(handle))
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
    await importAll(() => readSaveFolder(folder))
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
      <span className="text-xs text-neutral-500">{HINT} New saves are picked up when you come back to this tab.</span>
    </div>
  )
}

/** Other browsers can only upload the folder as it is now, so it has to be chosen again after each save. */
function UploadedFolder({ busy, importAll }: { busy: boolean; importAll: ImportAll }) {
  const markFolderUploaded = useAppStore(s => s.markFolderUploaded)
  return (
    <div className="space-y-2">
      <div role="note" className="rounded border border-amber-800 bg-amber-950/60 px-3 py-2 text-sm text-amber-200">
        This browser can't keep access to your save folder, so choose it again after you save in-game. Open the app in Chrome
        or Edge to have new saves picked up on their own.
      </div>
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <label className={`rounded bg-neutral-800 px-3 py-1.5 hover:bg-neutral-700 ${busy ? 'opacity-50' : 'cursor-pointer'}`}>
          {busy ? 'Reading…' : 'Choose save folder'}
          <input
            type="file"
            hidden
            disabled={busy}
            ref={el => el?.setAttribute('webkitdirectory', '')}
            onChange={e => {
              const files = Array.from(e.target.files ?? [])
              e.target.value = ''
              if (!files.length) return
              void importAll(() => readSaveFiles(files)).then(markFolderUploaded)
            }}
          />
        </label>
        <span className="text-xs text-neutral-500">{HINT}</span>
      </div>
    </div>
  )
}
