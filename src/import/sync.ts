import { useEffect } from 'react'
import { useAppStore } from '../state/app-store'
import { hasReadPermission, readSaveFolder, type FolderSave } from './folder'

export interface SyncResult {
  imported: number
  /** <BattleTag>/<Class> of the saves that could not be read. */
  failures: string[]
}

export async function importSaves(saves: FolderSave[]): Promise<SyncResult> {
  const { importSave } = useAppStore.getState()
  const failures: string[] = []
  for (const s of saves) {
    const r = await importSave(s.text, s.fileName, s.battleTag)
    if (!r.ok) failures.push(`${s.battleTag}/${s.classFolder}`)
  }
  return { imported: saves.length - failures.length, failures }
}

/** Re-reads the remembered save folder whenever the app comes back into view, so in-game saves show up on their own. */
export function useSaveFolderSync() {
  useEffect(() => {
    let running = false
    const sync = async () => {
      if (running || document.visibilityState === 'hidden') return
      running = true
      try {
        const folder = await useAppStore.getState().getSaveFolder()
        if (folder && (await hasReadPermission(folder))) await importSaves(await readSaveFolder(folder))
      } catch {
        // the folder moved or access was revoked; the Characters page offers to choose it again
      } finally {
        running = false
      }
    }
    window.addEventListener('focus', sync)
    document.addEventListener('visibilitychange', sync)
    return () => {
      window.removeEventListener('focus', sync)
      document.removeEventListener('visibilitychange', sync)
    }
  }, [])
}
