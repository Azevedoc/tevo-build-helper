import { parseRoute, toHash } from './route'

test('parses known routes', () => {
  expect(parseRoute('')).toEqual({ page: 'characters' })
  expect(parseRoute('#/')).toEqual({ page: 'characters' })
  expect(parseRoute('#/character/local%2FPaladin')).toEqual({ page: 'character', id: 'local/Paladin' })
  expect(parseRoute('#/data')).toEqual({ page: 'data' })
})

test('unknown routes fall back to characters', () => {
  expect(parseRoute('#/nope')).toEqual({ page: 'characters' })
})

test('toHash round-trips', () => {
  for (const r of [{ page: 'characters' }, { page: 'data' }, { page: 'character', id: 'Tag#1/Paladin' }] as const) {
    expect(parseRoute(toHash(r))).toEqual(r)
  }
})
