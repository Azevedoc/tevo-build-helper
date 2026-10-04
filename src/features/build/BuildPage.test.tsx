import { fireEvent, render, screen } from '@testing-library/react'
import fixture from '../../import/__fixtures__/paladin.txt?raw'
import { useAppStore } from '../../state/app-store'
import { createMemoryRepo } from '../../storage/repo'
import { BuildPage } from './BuildPage'

const store = () => useAppStore.getState()

beforeEach(async () => {
  await store().init(createMemoryRepo())
  await store().importSave(fixture, '[Level 312].txt')
})

test('offers to create a build when there is none', () => {
  render(<BuildPage characterId="local/Paladin" />)
  expect(screen.getByRole('button', { name: 'Create build' })).toBeInTheDocument()
})

test('creating a build and adding a goal shows its progress', async () => {
  vi.spyOn(window, 'prompt').mockReturnValue('Tank')
  render(<BuildPage characterId="local/Paladin" />)
  fireEvent.click(screen.getByRole('button', { name: 'Create build' }))
  fireEvent.change(await screen.findByPlaceholderText('Add goal…'), { target: { value: 'Glow Or' } })
  fireEvent.click(await screen.findByRole('button', { name: /Glow Orb/ }))
  const row = await screen.findByTestId('goal-row')
  expect(row).toHaveTextContent('Glow Orb')
  expect(row).toHaveTextContent('100%') // the fixture character owns a Glow Orb
})

test('goals missing from the dataset show as removed and can be removed', async () => {
  const build = await store().createBuild('local/Paladin', 'Old')
  await store().setGoals(build.id, ['no-longer-exists'])
  render(<BuildPage characterId="local/Paladin" />)
  expect(screen.getByText('Removed item')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Remove no-longer-exists' }))
  expect(await screen.findByText('Add a goal to get started.')).toBeInTheDocument()
})

test('clicking a goal expands its recipe one level', async () => {
  const build = await store().createBuild('local/Paladin', 'B')
  await store().setGoals(build.id, ['glow-orb'])
  render(<BuildPage characterId="local/Paladin" />)
  fireEvent.click(screen.getByRole('button', { name: 'Glow Orb' }))
  expect(await screen.findByText('Hell Diamond')).toBeInTheDocument()
  expect(screen.queryByText('Diabolic Orb')).not.toBeInTheDocument()
})

test('unknown character shows a not-found message', () => {
  render(<BuildPage characterId="nobody" />)
  expect(screen.getByText('Character not found.')).toBeInTheDocument()
})

test('materials panel shows totals for the active build', async () => {
  const build = await store().createBuild('local/Paladin', 'B')
  await store().setGoals(build.id, ['hell-diamond'])
  render(<BuildPage characterId="local/Paladin" />)
  expect(screen.getByTestId('material-hell-diamond')).toHaveTextContent('need 1')
})

test('materials panel empty state', async () => {
  await store().createBuild('local/Paladin', 'B')
  render(<BuildPage characterId="local/Paladin" />)
  expect(screen.getByText('Add a goal to see materials.')).toBeInTheDocument()
})

test('an item already in the build cannot be added again', async () => {
  const build = await store().createBuild('local/Paladin', 'B')
  await store().setGoals(build.id, ['glow-orb'])
  render(<BuildPage characterId="local/Paladin" />)
  fireEvent.change(screen.getByPlaceholderText('Add goal…'), { target: { value: 'Glow Or' } })
  const option = await screen.findByRole('button', { name: /Glow Orb.*in build/ })
  expect(option).toBeDisabled()
  fireEvent.click(option)
  expect(screen.getAllByTestId('goal-row')).toHaveLength(1)
})

test('duplicate goals saved earlier are shown once', async () => {
  const build = await store().createBuild('local/Paladin', 'B')
  await store().setGoals(build.id, ['glow-orb', 'hell-diamond', 'glow-orb'])
  render(<BuildPage characterId="local/Paladin" />)
  expect(screen.getAllByTestId('goal-row')).toHaveLength(2)
})

test('a drop-only goal shows where it drops instead of a progress bar', async () => {
  const build = await store().createBuild('local/Paladin', 'B')
  await store().setGoals(build.id, ['blazes-touch'])
  render(<BuildPage characterId="local/Paladin" />)
  const row = screen.getByTestId('goal-row')
  expect(row).toHaveTextContent('Drops from Dragon Fortress (Imp 2)')
  expect(row).not.toHaveTextContent('%')
})
