import { fireEvent, render, screen } from '@testing-library/react'
import fixture from '../../import/__fixtures__/paladin.txt?raw'
import { useAppStore } from '../../state/app-store'
import { createMemoryRepo } from '../../storage/repo'
import { CharactersPage } from './CharactersPage'

beforeEach(async () => {
  await useAppStore.getState().init(createMemoryRepo())
})

const drop = (content: string, name: string) => {
  const file = new File([content], name, { type: 'text/plain' })
  fireEvent.drop(screen.getByTestId('drop-zone'), { dataTransfer: { files: [file] } })
}

test('dropping a save file adds a character card', async () => {
  render(<CharactersPage />)
  drop(fixture, '[Level 312].txt')
  expect(await screen.findByText('Paladin')).toBeInTheDocument()
  expect(screen.getByText('Lv 312')).toBeInTheDocument()
})

test('dropping garbage shows an error', async () => {
  render(<CharactersPage />)
  drop('garbage', 'x.txt')
  expect(await screen.findByText(/Couldn't read this file/)).toBeInTheDocument()
})

test('unknown items are flagged on the card', async () => {
  render(<CharactersPage />)
  drop(fixture.replace('Item 3: Diamond', 'Item 3: Totally New Item'), '[Level 312].txt')
  expect(await screen.findByText('1 unknown item')).toBeInTheDocument()
})

test('the single-file drop zone is hidden once a save folder is remembered', async () => {
  await useAppStore.getState().setSaveFolder({ kind: 'directory', name: 'TEvo' } as unknown as FileSystemDirectoryHandle)
  render(<CharactersPage />)
  expect(screen.queryByTestId('drop-zone')).not.toBeInTheDocument()
})

test('the single-file drop zone is hidden after a folder upload, and stays hidden after reloading', async () => {
  const f = new File([fixture], '[Level 312].txt', { lastModified: 1 })
  Object.defineProperty(f, 'webkitRelativePath', { value: 'TEvo/Tag#1/Paladin/[Level 312].txt' })
  const { container, unmount } = render(<CharactersPage />)
  expect(screen.getByTestId('drop-zone')).toBeInTheDocument()
  fireEvent.change(container.querySelector('input[webkitdirectory]')!, { target: { files: [f] } })
  await vi.waitFor(() => expect(screen.queryByTestId('drop-zone')).not.toBeInTheDocument())
  unmount()
  render(<CharactersPage />)
  expect(screen.queryByTestId('drop-zone')).not.toBeInTheDocument()
})

test('the 4th class toggle hides lower-tier characters, and is remembered after reloading', async () => {
  const repo = createMemoryRepo()
  await useAppStore.getState().init(repo)
  const { importSave } = useAppStore.getState()
  await importSave(fixture, '[Level 312].txt')
  await importSave(fixture.replace('Hero: Paladin', 'Hero: Knight'), '[Level 99].txt')
  const { unmount } = render(<CharactersPage />)
  expect(screen.getByText('Knight')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('switch', { name: 'Only 4th class' }))
  expect(screen.queryByText('Knight')).not.toBeInTheDocument()
  expect(screen.getByText('Paladin')).toBeInTheDocument()
  unmount()
  await vi.waitFor(async () => {
    await useAppStore.getState().init(repo)
    expect(useAppStore.getState().onlyFourthClass).toBe(true)
  })
  render(<CharactersPage />)
  expect(screen.getByRole('switch', { name: 'Only 4th class' })).toBeChecked()
  expect(screen.queryByText('Knight')).not.toBeInTheDocument()
})
