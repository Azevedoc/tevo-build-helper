import { create } from 'zustand'
import { dataset } from '../data/dataset'
import { matchNames } from '../import/match'
import { parseSave, SaveParseError } from '../import/parse-save'
import { openRepo, type Repo } from '../storage/repo'
import type { Build, Character } from '../storage/types'

export type ImportResult =
  | { ok: true; characterId: string; unknownCount: number }
  | { ok: false; error: string }

export interface AppState {
  ready: boolean
  persistent: boolean
  characters: Character[]
  builds: Build[]
  /** A save folder was chosen, either remembered (Chrome, Edge) or uploaded at least once (other browsers). */
  hasSaveFolder: boolean
  init(repo?: Repo): Promise<void>
  importSave(text: string, fileName: string, battleTag?: string): Promise<ImportResult>
  deleteCharacter(id: string): Promise<void>
  /** The first build of a character becomes active. */
  createBuild(characterId: string, name: string): Promise<Build>
  renameBuild(id: string, name: string): Promise<void>
  /** Deleting the active build activates another build of the same character. */
  deleteBuild(id: string): Promise<void>
  setActiveBuild(id: string): Promise<void>
  setGoals(buildId: string, goals: string[]): Promise<void>
  getSaveFolder(): Promise<FileSystemDirectoryHandle | undefined>
  setSaveFolder(handle: FileSystemDirectoryHandle): Promise<void>
  markFolderUploaded(): Promise<void>
}

const SAVE_FOLDER_KEY = 'saveFolder'
const FOLDER_UPLOADED_KEY = 'saveFolderUploaded'

let repo: Repo | null = null
const getRepo = (): Repo => {
  if (!repo) throw new Error('App store used before init()')
  return repo
}

export const useAppStore = create<AppState>()((set, get) => {
  // State is updated synchronously before persisting, so rapid successive actions build on each other's
  // results instead of racing on a stale snapshot, and the UI never snaps back while a write is pending.
  const saveCharacter = async (c: Character) => {
    const others = get().characters.filter(x => x.id !== c.id)
    set({ characters: [...others, c] })
    await getRepo().putCharacter(c)
  }
  const saveBuilds = async (changed: Build[]) => {
    const ids = new Set(changed.map(b => b.id))
    set({ builds: [...get().builds.filter(b => !ids.has(b.id)), ...changed] })
    for (const b of changed) await getRepo().putBuild(b)
  }

  return {
    ready: false,
    persistent: false,
    characters: [],
    builds: [],
    hasSaveFolder: false,

    async init(r) {
      repo = r ?? (await openRepo())
      const [characters, builds, folder, uploaded] = await Promise.all([
        repo.listCharacters(),
        repo.listBuilds(),
        repo.getSetting(SAVE_FOLDER_KEY),
        repo.getSetting(FOLDER_UPLOADED_KEY),
      ])
      set({ ready: true, persistent: repo.persistent, characters, builds, hasSaveFolder: !!folder || !!uploaded })
    },

    async importSave(text, fileName, battleTag) {
      let parsed
      try {
        parsed = parseSave(text, fileName)
      } catch (e) {
        if (e instanceof SaveParseError) return { ok: false, error: "Couldn't read this file" }
        throw e
      }
      const { owned, unknownNames } = matchNames(parsed.slotNames, dataset)
      const id = `${battleTag ?? 'local'}/${parsed.hero}`
      const character: Character = {
        id,
        className: parsed.hero,
        level: parsed.level,
        ...(battleTag ? { battleTag } : {}),
        importedAt: new Date().toISOString(),
        imported: owned,
        unknownNames,
      }
      await saveCharacter(character)
      return { ok: true, characterId: id, unknownCount: unknownNames.length }
    },

    async deleteCharacter(id) {
      const r = getRepo()
      for (const b of get().builds.filter(x => x.characterId === id)) await r.deleteBuild(b.id)
      await r.deleteCharacter(id)
      set({
        characters: get().characters.filter(c => c.id !== id),
        builds: get().builds.filter(b => b.characterId !== id),
      })
    },

    async createBuild(characterId, name) {
      const hasBuilds = get().builds.some(b => b.characterId === characterId)
      const build: Build = { id: crypto.randomUUID(), characterId, name, goals: [], active: !hasBuilds }
      await saveBuilds([build])
      return build
    },

    async renameBuild(id, name) {
      const b = get().builds.find(x => x.id === id)
      if (b) await saveBuilds([{ ...b, name }])
    },

    async deleteBuild(id) {
      const b = get().builds.find(x => x.id === id)
      if (!b) return
      await getRepo().deleteBuild(id)
      set({ builds: get().builds.filter(x => x.id !== id) })
      if (b.active) {
        const next = get().builds.find(x => x.characterId === b.characterId)
        if (next) await saveBuilds([{ ...next, active: true }])
      }
    },

    async setActiveBuild(id) {
      const target = get().builds.find(x => x.id === id)
      if (!target) return
      const changed = get()
        .builds.filter(b => b.characterId === target.characterId && b.active !== (b.id === id))
        .map(b => ({ ...b, active: b.id === id }))
      await saveBuilds(changed)
    },

    async setGoals(buildId, goals) {
      const b = get().builds.find(x => x.id === buildId)
      if (b) await saveBuilds([{ ...b, goals }])
    },

    getSaveFolder() {
      return getRepo().getSetting<FileSystemDirectoryHandle>(SAVE_FOLDER_KEY)
    },

    async setSaveFolder(handle) {
      set({ hasSaveFolder: true })
      await getRepo().putSetting(SAVE_FOLDER_KEY, handle)
    },

    async markFolderUploaded() {
      set({ hasSaveFolder: true })
      await getRepo().putSetting(FOLDER_UPLOADED_KEY, true)
    },
  }
})
