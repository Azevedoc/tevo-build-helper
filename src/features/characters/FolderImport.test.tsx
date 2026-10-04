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

describe('in a browser that cannot keep a folder', () => {
  beforeEach(() => {
    delete window.showDirectoryPicker
  })

  test('warns that only Chrome and Edge pick up new saves on their own', () => {
    render(<FolderImport onNotice={vi.fn()} />)
    expect(screen.getByRole('note')).toHaveTextContent(/Chrome or Edge/)
  })

  test('falls back to uploading the folder, importing the newest save per character', async () => {
    const onNotice = vi.fn()
    const { container } = render(<FolderImport onNotice={onNotice} />)
    const input = container.querySelector('input[type=file]') as HTMLInputElement
    expect(input).toHaveAttribute('webkitdirectory')
    const f = new File([fixture], '[Level 312].txt', { lastModified: 1 })
    Object.defineProperty(f, 'webkitRelativePath', { value: 'TwilightsEve/Tag#1/Paladin/[Level 312].txt' })
    fireEvent.change(input, { target: { files: [f] } })
    await vi.waitFor(() => expect(onNotice).toHaveBeenCalledWith({ kind: 'info', text: 'Imported 1 character' }))
    expect(useAppStore.getState().characters.map(c => c.id)).toEqual(['Tag#1/Paladin'])
  })
})
