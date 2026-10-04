import { createMemoryRepo, openRepo, type Repo } from './repo'
import type { Build, Character } from './types'

const character: Character = {
  id: 'local/Paladin', className: 'Paladin', level: 312, importedAt: '2026-10-04T00:00:00.000Z',
  imported: { ruby: 2 }, unknownNames: [], adjustments: {},
}
const build: Build = { id: 'b1', characterId: 'local/Paladin', name: 'Tank', goals: ['hyperion'], active: true }

async function roundTrip(repo: Repo) {
  await repo.putCharacter(character)
  await repo.putBuild(build)
  await repo.putSetting('k', { a: 1 })
  expect(await repo.listCharacters()).toEqual([character])
  expect(await repo.listBuilds()).toEqual([build])
  expect(await repo.getSetting('k')).toEqual({ a: 1 })
  expect(await repo.getSetting('missing')).toBeUndefined()
  await repo.deleteCharacter(character.id)
  await repo.deleteBuild(build.id)
  expect(await repo.listCharacters()).toEqual([])
  expect(await repo.listBuilds()).toEqual([])
}

test('IndexedDB repo round-trips characters, builds and settings', async () => {
  const repo = await openRepo()
  expect(repo.persistent).toBe(true)
  await roundTrip(repo)
})

test('memory repo round-trips and is not persistent', async () => {
  const repo = createMemoryRepo()
  expect(repo.persistent).toBe(false)
  await roundTrip(repo)
})
