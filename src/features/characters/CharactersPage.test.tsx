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
