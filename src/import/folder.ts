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

const isSave = (name: string) => name.includes('[Level')

/** Layout: <root>/<BattleTag>/<Class>/[Level N].txt — the most recently modified level file per class wins. */
export async function readSaveFolder(root: FileSystemDirectoryHandle): Promise<FolderSave[]> {
  const saves: FolderSave[] = []
  for (const tag of await subdirectories(root)) {
    for (const cls of await subdirectories(tag)) {
      let newest: File | null = null
      for await (const entry of cls.values()) {
        if (entry.kind !== 'file' || !isSave(entry.name)) continue
        const f = await (entry as FileSystemFileHandle).getFile()
        if (!newest || f.lastModified > newest.lastModified) newest = f
      }
      if (newest) saves.push({ battleTag: tag.name, classFolder: cls.name, fileName: newest.name, text: await newest.text() })
    }
  }
  return saves
}

/** Same as readSaveFolder, for a folder upload: each file's path ends in <BattleTag>/<Class>/[Level N].txt. */
export async function readSaveFiles(files: File[]): Promise<FolderSave[]> {
  const newest = new Map<string, { battleTag: string; classFolder: string; file: File }>()
  for (const file of files) {
    const parts = file.webkitRelativePath.split('/')
    if (parts.length < 3 || !isSave(file.name)) continue
    const [battleTag, classFolder] = parts.slice(-3, -1)
    const key = `${battleTag}/${classFolder}`
    const current = newest.get(key)
    if (!current || file.lastModified > current.file.lastModified) newest.set(key, { battleTag, classFolder, file })
  }
  return Promise.all(
    [...newest.values()].map(async ({ battleTag, classFolder, file }) => ({ battleTag, classFolder, fileName: file.name, text: await file.text() })),
  )
}

/** Checks without prompting, so it is safe outside a user gesture. */
export async function hasReadPermission(handle: FileSystemDirectoryHandle): Promise<boolean> {
  const h = handle as unknown as PermissionedHandle
  return !h.queryPermission || (await h.queryPermission({ mode: 'read' })) === 'granted'
}

/** Must be called from a user gesture when permission needs to be requested. */
export async function ensureReadPermission(handle: FileSystemDirectoryHandle): Promise<boolean> {
  const h = handle as unknown as PermissionedHandle
  if (await hasReadPermission(handle)) return true
  return (await h.requestPermission?.({ mode: 'read' })) === 'granted'
}
