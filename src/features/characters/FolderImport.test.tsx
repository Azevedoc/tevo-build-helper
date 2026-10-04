import { fireEvent, render, screen } from '@testing-library/react'
import fixture from '../../import/__fixtures__/paladin.txt?raw'
import { useAppStore } from '../../state/app-store'
import { createMemoryRepo } from '../../storage/repo'
import { FolderImport } from './FolderImport'

const fakeFolder = {
  kind: 'directory',
  name: 'CustomMapData',
  values: async function* () {
    yield {
      kind: 'directory',
      name: 'Tag#1',
      values: async function* () {
        yield {
          kind: 'directory',
          name: 'Paladin',
          values: async function* () {
            yield {
              kind: 'file',
              name: '[Level 312].txt',
              getFile: async () => ({ name: '[Level 312].txt', lastModified: 1, text: async () => fixture }),
            }
          },
        }
      },
    }
  },
}

beforeEach(async () => {
  await useAppStore.getState().init(createMemoryRepo())
  window.showDirectoryPicker = vi.fn().mockResolvedValue(fakeFolder)
})

afterEach(() => {
  delete window.showDirectoryPicker
})

test('folder import reports how many characters were imported', async () => {
  const onNotice = vi.fn()
  render(<FolderImport onNotice={onNotice} />)
  fireEvent.click(screen.getByRole('button', { name: 'Choose save folder' }))
  await vi.waitFor(() => expect(onNotice).toHaveBeenCalled())
  expect(onNotice.mock.calls[0][0]).toEqual({ kind: 'info', text: 'Imported 1 character' })
})
