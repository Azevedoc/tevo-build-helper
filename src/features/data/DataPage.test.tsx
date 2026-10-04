import { render, screen } from '@testing-library/react'
import fixture from '../../import/__fixtures__/paladin.txt?raw'
import { useAppStore } from '../../state/app-store'
import { createMemoryRepo } from '../../storage/repo'
import { DataPage } from './DataPage'

beforeEach(async () => {
  await useAppStore.getState().init(createMemoryRepo())
})

test('shows dataset info and credits', () => {
  render(<DataPage />)
  expect(screen.getByText(/Map version 7\.39b/)).toBeInTheDocument()
  expect(screen.getByText(/2026-10-04/)).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'EvoHelper' })).toHaveAttribute('href', 'https://codeberg.org/ArgentumHeart/EvoHelper')
  expect(screen.getByRole('link', { name: 'Report wrong data' })).toBeInTheDocument()
})

test('says when no unknown items were seen', () => {
  render(<DataPage />)
  expect(screen.getByText('No unknown items seen.')).toBeInTheDocument()
})

test('lists unknown item names from all characters with their source', async () => {
  await useAppStore.getState().importSave(fixture.replace('Item 3: Diamond', 'Item 3: Zeta Thing'), '[Level 1].txt')
  await useAppStore.getState().importSave(fixture.replace('Item 3: Diamond', 'Item 3: Alpha Thing'), '[Level 1].txt', 'Tag#1')
  render(<DataPage />)
  const rows = screen.getAllByTestId('unknown-item')
  expect(rows.map(r => r.textContent)).toEqual(['Alpha Thing — Tag#1/Paladin', 'Zeta Thing — local/Paladin'])
})
