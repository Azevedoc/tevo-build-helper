import { render, screen } from '@testing-library/react'
import App from './App'

test('renders the app title', () => {
  render(<App />)
  expect(screen.getByText('TEvo Build Helper')).toBeInTheDocument()
})

test('the footer thanks the wiki and EvoHelper', () => {
  render(<App />)
  const footer = screen.getByRole('contentinfo')
  expect(footer).toHaveTextContent(/Thanks to the Twilight's Eve Evo Wiki and EvoHelper/)
  expect(screen.getByRole('link', { name: "Twilight's Eve Evo Wiki" })).toHaveAttribute('href', 'https://twilights-eve-evo.fandom.com/')
})
