import { buildIndex } from '../../src/data/dataset'
import { parseRecommendations, resolveBuilds } from './parse'

const lua = `return {
	IMP1 = {
		"Blade of the Ruined King",
		{
			recommended = "Magic Mirror",
			alternatives = {
				"Black Hades"
			}
		},
	},
	IMP2 = { 'Glow Orb', "Tainted Neptune's Eye" },
	}`

test('parses the recommended items of each tier, in order, without alternatives', () => {
  expect(parseRecommendations(lua)).toEqual({
    IMP1: ['Blade of the Ruined King', 'Magic Mirror'],
    IMP2: ['Glow Orb', "Tainted Neptune's Eye"],
  })
})

test('resolves item names to dataset ids and reports the ones it cannot find', () => {
  const index = buildIndex({
    mapVersion: 'x', updatedAt: 'x', seededFrom: 'x',
    items: [
      { id: 'glow-orb', name: 'Glow Orb', rarity: 'x', recipe: [] },
      { id: 'tainted-neptunes-eye', name: 'Tainted Neptune´s Eye', rarity: 'x', recipe: [] },
    ],
  } as never)
  expect(resolveBuilds({ IMP2: ['Glow Orb', "Tainted Neptune's Eye", 'Nope'] }, index)).toEqual({
    builds: { 'Imp 2': ['glow-orb', 'tainted-neptunes-eye'] },
    missing: ['Nope'],
  })
})

test("names role variants of a tier, like Rune Master's IMP1TANK", () => {
  const index = buildIndex({ mapVersion: 'x', updatedAt: 'x', seededFrom: 'x', items: [] } as never)
  expect(Object.keys(resolveBuilds({ IMP1TANK: [], IMP3DPS: [] }, index).builds)).toEqual(['Imp 1 Tank', 'Imp 3 DPS'])
})
