export interface FolderSave {
  battleTag: string
  classFolder: string
  fileName: string
  text: string
}

type PermissionMode = { mode: 'read' }
interface PermissionedHandle {
  queryPermission?(d: PermissionMode): Promise<PermissionState>
  requestPermission?(d: PermissionMode): Promise<PermissionState>
}

declare global {
  interface Window {
    showDirectoryPicker?(options?: { mode?: 'read' | 'readwrite' }): Promise<FileSystemDirectoryHandle>
  }
}

export function supportsFolderPicker(): boolean {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window
}

async function subdirectories(handle: FileSystemDirectoryHandle): Promise<FileSystemDirectoryHandle[]> {
  const dirs: FileSystemDirectoryHandle[] = []
  for await (const entry of handle.values()) if (entry.kind === 'directory') dirs.push(entry as FileSystemDirectoryHandle)
  return dirs
}

/** Layout: <root>/<BattleTag>/<Class>/[Level N].txt — the most recently modified level file per class wins. */
export async function readSaveFolder(root: FileSystemDirectoryHandle): Promise<FolderSave[]> {
  const saves: FolderSave[] = []
  for (const tag of await subdirectories(root)) {
    for (const cls of await subdirectories(tag)) {
      let newest: File | null = null
      for await (const entry of cls.values()) {
        if (entry.kind !== 'file' || !entry.name.includes('[Level')) continue
        const f = await (entry as FileSystemFileHandle).getFile()
        if (!newest || f.lastModified > newest.lastModified) newest = f
      }
      if (newest) saves.push({ battleTag: tag.name, classFolder: cls.name, fileName: newest.name, text: await newest.text() })
    }
  }
  return saves
}

/** Must be called from a user gesture when permission needs to be requested. */
export async function ensureReadPermission(handle: FileSystemDirectoryHandle): Promise<boolean> {
  const h = handle as unknown as PermissionedHandle
  if (!h.queryPermission) return true
  if ((await h.queryPermission({ mode: 'read' })) === 'granted') return true
  return (await h.requestPermission?.({ mode: 'read' })) === 'granted'
}
