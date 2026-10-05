import { fireEvent, render, screen } from '@testing-library/react'
import { dataset } from '../data/dataset'
import { ItemIcon } from './ItemIcon'

test("hovering an icon shows the item's in-game tooltip", () => {
  const { container } = render(<ItemIcon item={dataset.items.get('glow-orb')!} />)
  expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  fireEvent.mouseEnter(container.firstChild!)
  const tip = screen.getByRole('tooltip')
  expect(tip).toHaveTextContent('Glow Orb')
  expect(tip).toHaveTextContent('+400 All Stats')
  expect(tip).toHaveTextContent('The orb that contains the power of the elements.')
  fireEvent.mouseLeave(container.firstChild!)
  expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
})
