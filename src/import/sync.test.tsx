import { renderHook } from '@testing-library/react'
import fixture from './__fixtures__/paladin.txt?raw'
import { useAppStore } from '../state/app-store'
import { createMemoryRepo } from '../storage/repo'
import { useSaveFolderSync } from './sync'

const folder = (permission: PermissionState, text = fixture) => ({
  kind: 'directory',
  name: 'TwilightsEve',
  queryPermission: async () => permission,
  values: async function* () {
    yield {
      kind: 'directory',
      name: 'Tag#1',
      values: async function* () {
        yield {
          kind: 'directory',
          name: 'Paladin',
          values: async function* () {
            yield { kind: 'file', name: '[Level 312].txt', getFile: async () => ({ name: '[Level 312].txt', lastModified: 1, text: async () => text }) }
          },
        }
      },
    }
  },
})

beforeEach(async () => {
  await useAppStore.getState().init(createMemoryRepo())
})

test('switching back to the app re-reads the remembered save folder', async () => {
  await useAppStore.getState().setSaveFolder(folder('granted') as unknown as FileSystemDirectoryHandle)
  renderHook(() => useSaveFolderSync())
  window.dispatchEvent(new Event('focus'))
  await vi.waitFor(() => expect(useAppStore.getState().characters.map(c => c.id)).toEqual(['Tag#1/Paladin']))
})

test('does not re-read when the browser has not granted folder access', async () => {
  await useAppStore.getState().setSaveFolder(folder('prompt') as unknown as FileSystemDirectoryHandle)
  renderHook(() => useSaveFolderSync())
  window.dispatchEvent(new Event('focus'))
  await new Promise(r => setTimeout(r, 20))
  expect(useAppStore.getState().characters).toEqual([])
})
