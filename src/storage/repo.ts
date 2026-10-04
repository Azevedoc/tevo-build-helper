import { openDB } from 'idb'
import type { Build, Character } from './types'

export interface Repo {
  persistent: boolean
  listCharacters(): Promise<Character[]>
  putCharacter(c: Character): Promise<void>
  deleteCharacter(id: string): Promise<void>
  listBuilds(): Promise<Build[]>
  putBuild(b: Build): Promise<void>
  deleteBuild(id: string): Promise<void>
  getSetting<T>(key: string): Promise<T | undefined>
  putSetting(key: string, value: unknown): Promise<void>
}

export async function openRepo(): Promise<Repo> {
  try {
    const db = await openDB('tevo-build-helper', 1, {
      upgrade(db) {
        db.createObjectStore('characters', { keyPath: 'id' })
        db.createObjectStore('builds', { keyPath: 'id' })
        db.createObjectStore('settings')
      },
    })
    return {
      persistent: true,
      listCharacters: () => db.getAll('characters'),
      putCharacter: async c => void (await db.put('characters', c)),
      deleteCharacter: id => db.delete('characters', id),
      listBuilds: () => db.getAll('builds'),
      putBuild: async b => void (await db.put('builds', b)),
      deleteBuild: id => db.delete('builds', id),
      getSetting: key => db.get('settings', key),
      putSetting: async (key, value) => void (await db.put('settings', value, key)),
    }
  } catch {
    return createMemoryRepo()
  }
}

export function createMemoryRepo(): Repo {
  const characters = new Map<string, Character>()
  const builds = new Map<string, Build>()
  const settings = new Map<string, unknown>()
  const copy = <T,>(v: T): T => structuredClone(v)
  return {
    persistent: false,
    listCharacters: async () => [...characters.values()].map(copy),
    putCharacter: async c => void characters.set(c.id, copy(c)),
    deleteCharacter: async id => void characters.delete(id),
    listBuilds: async () => [...builds.values()].map(copy),
    putBuild: async b => void builds.set(b.id, copy(b)),
    deleteBuild: async id => void builds.delete(id),
    getSetting: async <T,>(key: string) => settings.get(key) as T | undefined,
    putSetting: async (key, value) => void settings.set(key, value),
  }
}
