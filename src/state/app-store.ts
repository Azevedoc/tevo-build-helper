import { create } from 'zustand'
import { dataset } from '../data/dataset'
import { matchNames } from '../import/match'
import { parseSave, SaveParseError } from '../import/parse-save'
import { openRepo, type Repo } from '../storage/repo'
import type { Build, Character } from '../storage/types'

export type ImportResult =
  | { ok: true; characterId: string; unknownCount: number; clearedAdjustments: boolean }
  | { ok: false; error: string }

export interface AppState {
  ready: boolean
  persistent: boolean
  characters: Character[]
  builds: Build[]
  init(repo?: Repo): Promise<void>
  importSave(text: string, fileName: string, battleTag?: string): Promise<ImportResult>
  adjust(characterId: string, itemId: string, delta: number): Promise<void>
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
}

const SAVE_FOLDER_KEY = 'saveFolder'

let repo: Repo | null = null
const getRepo = (): Repo => {
  if (!repo) throw new Error('App store used before init()')
  return repo
}

export const useAppStore = create<AppState>()((set, get) => {
  const saveCharacter = async (c: Character) => {
    await getRepo().putCharacter(c)
    set({ characters: [...get().characters.filter(x => x.id !== c.id), c] })
  }
  const saveBuilds = async (changed: Build[]) => {
    for (const b of changed) await getRepo().putBuild(b)
    const ids = new Set(changed.map(b => b.id))
    set({ builds: [...get().builds.filter(b => !ids.has(b.id)), ...changed] })
  }

  return {
    ready: false,
    persistent: false,
    characters: [],
    builds: [],

    async init(r) {
      repo = r ?? (await openRepo())
      const [characters, builds] = await Promise.all([repo.listCharacters(), repo.listBuilds()])
      set({ ready: true, persistent: repo.persistent, characters, builds })
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
      const previous = get().characters.find(c => c.id === id)
      const clearedAdjustments = !!previous && Object.keys(previous.adjustments).length > 0
      const character: Character = {
        id,
        className: parsed.hero,
        level: parsed.level,
        ...(battleTag ? { battleTag } : {}),
        importedAt: new Date().toISOString(),
        imported: owned,
        unknownNames,
        adjustments: {},
      }
      await saveCharacter(character)
      return { ok: true, characterId: id, unknownCount: unknownNames.length, clearedAdjustments }
    },

    async adjust(characterId, itemId, delta) {
      const c = get().characters.find(x => x.id === characterId)
      if (!c) return
      const next = (c.adjustments[itemId] ?? 0) + delta
      const adjustments = { ...c.adjustments }
      if (next === 0) delete adjustments[itemId]
      else adjustments[itemId] = next
      await saveCharacter({ ...c, adjustments })
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
      await getRepo().putSetting(SAVE_FOLDER_KEY, handle)
    },
  }
})
