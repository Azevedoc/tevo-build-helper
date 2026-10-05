import { fireEvent, render, screen, within } from '@testing-library/react'
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

test('adding a goal the character already owns shows it as obtained', async () => {
  vi.spyOn(window, 'prompt').mockReturnValue('Tank')
  render(<BuildPage characterId="local/Paladin" />)
  fireEvent.click(screen.getByRole('button', { name: 'Create build' }))
  fireEvent.change(await screen.findByPlaceholderText('Add goal…'), { target: { value: 'Glow Or' } })
  fireEvent.click(await screen.findByRole('button', { name: /Glow Orb/ }))
  const row = await screen.findByTestId('goal-row')
  expect(row).toHaveTextContent('Glow Orb')
  expect(row).toHaveTextContent('Obtained') // the fixture character owns a Glow Orb
  expect(row).not.toHaveTextContent('%')
})

test('goals missing from the dataset show as removed and can be removed', async () => {
  const build = await store().createBuild('local/Paladin', 'Old')
  await store().setGoals(build.id, ['no-longer-exists'])
  render(<BuildPage characterId="local/Paladin" />)
  expect(screen.getByText('Removed item')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Remove no-longer-exists' }))
  expect(await screen.findByText('Add a goal to get started.')).toBeInTheDocument()
})

test('a goal dropdown lists its materials with owned and needed counts', async () => {
  const build = await store().createBuild('local/Paladin', 'B')
  await store().setGoals(build.id, ['hell-diamond'])
  render(<BuildPage characterId="local/Paladin" />)
  expect(screen.queryByTestId('goal-part')).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Show materials for Hell Diamond' }))
  const parts = screen.getAllByTestId('goal-part').map(p => p.textContent)
  expect(parts).toContain('Ruby1/1') // the fixture character owns Rubies
  expect(parts).toContain('Diabolic Orb0/1')
})

test('an intermediate in the dropdown expands to show what it is made from', async () => {
  const build = await store().createBuild('local/Paladin', 'B')
  await store().setGoals(build.id, ['starlight-crystal'])
  render(<BuildPage characterId="local/Paladin" />)
  fireEvent.click(screen.getByRole('button', { name: 'Show materials for Starlight Crystal' }))
  const goal = screen.getByTestId('goal-row').closest('li')!
  expect(within(goal).getByText('Draconic Trinity')).toBeInTheDocument()
  expect(within(goal).queryByText('Dragon Egg')).not.toBeInTheDocument()
  fireEvent.click(within(goal).getByRole('button', { name: 'Show materials for Draconic Trinity' }))
  expect(within(goal).getByText('Dragon Egg')).toBeInTheDocument()
})

test('an obtained goal drops down the items built from it instead of its materials', async () => {
  const build = await store().createBuild('local/Paladin', 'B')
  await store().setGoals(build.id, ['glow-orb'])
  render(<BuildPage characterId="local/Paladin" />)
  expect(screen.queryByRole('button', { name: 'Show materials for Glow Orb' })).not.toBeInTheDocument()
  expect(screen.queryByTestId('goal-upgrade')).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Show items built from Glow Orb' }))
  expect(screen.getAllByTestId('goal-upgrade').map(u => u.textContent)).toEqual(['Legendary Dragon Orb'])
})

test('an obtained goal nothing is built from has no dropdown', async () => {
  await store().importSave(fixture.replace('Item 4: ', 'Item 4: Arcane Orb'), '[Level 312].txt')
  const build = await store().createBuild('local/Paladin', 'B')
  await store().setGoals(build.id, ['arcane-orb'])
  render(<BuildPage characterId="local/Paladin" />)
  expect(screen.getByTestId('goal-row')).toHaveTextContent('Obtained')
  expect(screen.queryByRole('button', { name: /Arcane Orb/ })).toHaveAccessibleName('Remove Arcane Orb')
})

test('unknown character shows a not-found message', () => {
  render(<BuildPage characterId="nobody" />)
  expect(screen.getByText('Character not found.')).toBeInTheDocument()
})

test('materials panel lists what is left to farm for the active build', async () => {
  const build = await store().createBuild('local/Paladin', 'B')
  await store().setGoals(build.id, ['blazes-touch'])
  render(<BuildPage characterId="local/Paladin" />)
  expect(screen.getByTestId('source-group')).toHaveTextContent("Blaze's Touch0/1")
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

test('a wiki build can be picked as the starting point of a new build', async () => {
  render(<BuildPage characterId="local/Paladin" />)
  fireEvent.change(screen.getByLabelText('Start from wiki build'), { target: { value: 'Imp 1' } })
  expect(await screen.findByRole('combobox', { name: 'Active build' })).toHaveDisplayValue('Imp 1 (wiki)')
  const goals = screen.getAllByTestId('goal-row').map(r => r.textContent)
  expect(goals).toHaveLength(6)
  expect(goals[0]).toContain('Blade of the Ruined King')
  expect(goals[5]).toContain('Magic Mirror')
})

test('classes without wiki builds get no wiki build picker', async () => {
  await store().importSave(fixture.replace('Hero: Paladin', 'Hero: Knight'), '[Level 1].txt')
  render(<BuildPage characterId="local/Knight" />)
  expect(screen.queryByLabelText('Start from wiki build')).not.toBeInTheDocument()
})

test('focusing the goal box lists every item alphabetically to pick from', async () => {
  vi.spyOn(window, 'prompt').mockReturnValue('Tank')
  render(<BuildPage characterId="local/Paladin" />)
  fireEvent.click(screen.getByRole('button', { name: 'Create build' }))
  const input = await screen.findByPlaceholderText('Add goal…')
  expect(screen.queryByRole('button', { name: /Master Sword/ })).not.toBeInTheDocument()
  fireEvent.focus(input)
  const list = screen.getByRole('list', { name: 'Goal suggestions' })
  const names = within(list).getAllByRole('button').map(b => b.textContent!.replace(/(in build|legacy)$/, ''))
  expect(names.length).toBeGreaterThan(100)
  expect(names).toContain('Vespermoon')
  expect(names).not.toContain("Atma's Ring") // H1 drops aren't offered
  expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)))
  fireEvent.click(within(list).getByRole('button', { name: /Master Sword/ }))
  expect(await screen.findByTestId('goal-row')).toHaveTextContent('Master Sword')
  expect(screen.queryByRole('list', { name: 'Goal suggestions' })).not.toBeInTheDocument() // closes after picking
  fireEvent.blur(input)
  fireEvent.focus(input)
  fireEvent.keyDown(input, { key: 'Escape' })
  expect(screen.queryByRole('list', { name: 'Goal suggestions' })).not.toBeInTheDocument()
})
