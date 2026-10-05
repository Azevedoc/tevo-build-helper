import fixture from '../import/__fixtures__/paladin.txt?raw'
import { createMemoryRepo } from '../storage/repo'
import { useAppStore } from './app-store'

const store = () => useAppStore.getState()

beforeEach(async () => {
  await store().init(createMemoryRepo())
})

test('init marks the store ready and reports persistence', () => {
  expect(store().ready).toBe(true)
  expect(store().persistent).toBe(false)
})

test('importSave creates a character from a save file', async () => {
  const result = await store().importSave(fixture, '[Level 312].txt')
  expect(result).toEqual({ ok: true, characterId: 'local/Paladin', unknownCount: 0 })
  const c = store().characters[0]
  expect(c).toMatchObject({ id: 'local/Paladin', className: 'Paladin', level: 312 })
  expect(c.imported).toMatchObject({ ruby: 2, hyperion: 1, 'glow-orb': 1, diamond: 1 })
})

test('re-import replaces the character and keeps builds', async () => {
  await store().importSave(fixture, '[Level 312].txt')
  await store().createBuild('local/Paladin', 'Tank')
  const result = await store().importSave(fixture, '[Level 313].txt')
  expect(result).toMatchObject({ ok: true })
  expect(store().characters[0]).not.toHaveProperty('adjustments')
  expect(store().characters[0]).toMatchObject({ level: 313 })
  expect(store().builds).toHaveLength(1)
})

test('a battleTag namespaces the character id', async () => {
  const result = await store().importSave(fixture, '[Level 312].txt', 'Tag#1')
  expect(result).toMatchObject({ ok: true, characterId: 'Tag#1/Paladin' })
})

test('a folder import absorbs the file-imported copy of the same class and its builds', async () => {
  await store().importSave(fixture, '[Level 312].txt', 'Tag#1')
  const current = await store().createBuild('Tag#1/Paladin', 'Current')
  await store().importSave(fixture, '[Level 312].txt')
  const old = await store().createBuild('local/Paladin', 'Old')

  await store().importSave(fixture, '[Level 313].txt', 'Tag#1')

  expect(store().characters.map(c => c.id)).toEqual(['Tag#1/Paladin'])
  const builds = store().builds
  expect(builds.map(b => b.id).sort()).toEqual([current.id, old.id].sort())
  expect(builds.every(b => b.characterId === 'Tag#1/Paladin')).toBe(true)
  expect(builds.filter(b => b.active).map(b => b.id)).toEqual([current.id])
})

test('a file import with no tagged copy stays local', async () => {
  await store().importSave(fixture, '[Level 312].txt', 'Tag#1')
  await store().importSave(fixture, '[Level 312].txt')
  expect(store().characters.map(c => c.id).sort()).toEqual(['Tag#1/Paladin', 'local/Paladin'])
})

test('unreadable save is rejected and leaves characters unchanged', async () => {
  const result = await store().importSave('garbage', 'x.txt')
  expect(result.ok).toBe(false)
  expect(store().characters).toEqual([])
})

test('build lifecycle: first is active, switching, deleting the active one', async () => {
  await store().importSave(fixture, '[Level 312].txt')
  const first = await store().createBuild('local/Paladin', 'One')
  const second = await store().createBuild('local/Paladin', 'Two')
  const active = () => store().builds.filter(b => b.active).map(b => b.id)
  expect(active()).toEqual([first.id])
  await store().setActiveBuild(second.id)
  expect(active()).toEqual([second.id])
  await store().renameBuild(second.id, 'Two!')
  await store().setGoals(second.id, ['hyperion'])
  expect(store().builds.find(b => b.id === second.id)).toMatchObject({ name: 'Two!', goals: ['hyperion'] })
  await store().deleteBuild(second.id)
  expect(active()).toEqual([first.id])
})

test('deleting a character removes its builds', async () => {
  await store().importSave(fixture, '[Level 312].txt')
  await store().createBuild('local/Paladin', 'One')
  await store().deleteCharacter('local/Paladin')
  expect(store().characters).toEqual([])
  expect(store().builds).toEqual([])
})

test('state survives re-init from the same repo', async () => {
  const repo = createMemoryRepo()
  await store().init(repo)
  await store().importSave(fixture, '[Level 312].txt')
  await store().createBuild('local/Paladin', 'One')
  await store().init(repo)
  expect(store().characters).toHaveLength(1)
  expect(store().builds).toHaveLength(1)
})

test('remembers the save folder handle', async () => {
  const handle = { name: 'CustomMapData' } as unknown as FileSystemDirectoryHandle
  expect(await store().getSaveFolder()).toBeUndefined()
  await store().setSaveFolder(handle)
  expect(await store().getSaveFolder()).toBe(handle)
})

test('state updates before persistence resolves', async () => {
  await store().importSave(fixture, '[Level 312].txt')
  const build = await store().createBuild('local/Paladin', 'B')
  const pending = store().setGoals(build.id, ['ruby'])
  expect(store().builds[0].goals).toEqual(['ruby'])
  await pending
})
