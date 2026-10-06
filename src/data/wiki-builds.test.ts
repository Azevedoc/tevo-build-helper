import { wikiBuilds, withCombinedRoles } from './wiki-builds'

test('classes with tank and DPS builds also get a combined build per Imp, without duplicates', () => {
  expect(withCombinedRoles({ 'Imp 1 Tank': ['a', 'b'], 'Imp 1 DPS': ['b', 'c'] })).toEqual({
    'Imp 1 Tank': ['a', 'b'],
    'Imp 1 DPS': ['b', 'c'],
    'Imp 1 Both': ['a', 'b', 'c'],
  })
})

test('classes with a single build per Imp get no combined build', () => {
  expect(withCombinedRoles({ 'Imp 1': ['a'] })).toEqual({ 'Imp 1': ['a'] })
})

test('Rune Master gets a combined build for each Imp', () => {
  const builds = wikiBuilds('Rune Master')
  expect(Object.keys(builds)).toEqual(expect.arrayContaining(['Imp 1 Both', 'Imp 2 Both', 'Imp 3 Both']))
  expect(builds['Imp 2 Both']).toEqual(expect.arrayContaining([...builds['Imp 2 Tank'], ...builds['Imp 2 DPS']]))
})
