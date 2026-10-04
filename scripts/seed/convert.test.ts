import { validateDataset } from '../../src/data/validate'
import { convertSync, slugify, type EvoSync } from './convert'

const item = (over: Partial<EvoSync['data']['items'][number]>): EvoSync['data']['items'][number] => ({
  id: 0, name: '', displayName: '', icon: '', iconBase64: null, legacyItem: false,
  description: null, effects: null, rarityId: 1, source: null, sourceShort: null, ...over,
})

const raw: EvoSync = {
  version: '7.39b',
  data: {
    items: [
      item({ id: 1, name: "Death´s Edge", rarityId: 7, effects: '+10 Damage$+5 Armor', source: 'Agahnim', sourceShort: 'H2',
        iconBase64: 'data:image/png;base64,AAAA' }),
      item({ id: 2, name: 'Ruby', source: 'Shop', sourceShort: '' }),
      item({ id: 3, name: 'Diamond', source: '' }),
      item({ id: 4, name: 'Old Thing', legacyItem: true, description: 'gone' }),
    ],
    itemRecipes: [
      { id: 1, outputId: 1, inputId: 2, quantity: 2 },
      { id: 2, outputId: 1, inputId: 3, quantity: 1 },
      { id: 3, outputId: 1, inputId: 2, quantity: 1 },
    ],
    itemRarities: [
      { id: 1, name: 'Common' }, { id: 7, name: 'Forged' },
    ],
  },
}

const { dataset, icons } = convertSync(raw, '2026-10-04')
const byId = new Map(dataset.items.map(i => [i.id, i]))

test('slugify strips apostrophe variants and punctuation', () => {
  expect(slugify("Death´s Edge")).toBe('deaths-edge')
  expect(slugify("  Blade of the Ruined King (M) ")).toBe('blade-of-the-ruined-king-m')
})

test('merges duplicate recipe rows and sums quantities', () => {
  expect(byId.get('deaths-edge')?.recipe).toEqual([{ item: 'ruby', qty: 3 }, { item: 'diamond', qty: 1 }])
})

test('splits effects on $', () => {
  expect(byId.get('deaths-edge')?.effects).toEqual(['+10 Damage', '+5 Armor'])
})

test('maps sources, omitting empty tiers and empty sources', () => {
  expect(byId.get('deaths-edge')?.sources).toEqual([{ where: 'Agahnim', tier: 'H2' }])
  expect(byId.get('ruby')?.sources).toEqual([{ where: 'Shop' }])
  expect(byId.get('diamond')?.sources).toEqual([])
})

test('maps rarity names, legacy flag, description and icons', () => {
  expect(byId.get('deaths-edge')?.rarity).toBe('forged')
  expect(byId.get('old-thing')).toMatchObject({ legacy: true, description: 'gone' })
  expect(byId.get('ruby')?.legacy).toBeUndefined()
  expect(byId.get('deaths-edge')?.icon).toBe('deaths-edge.png')
  expect(icons).toEqual([{ file: 'deaths-edge.png', base64: 'AAAA' }])
})

test('stamps metadata, sorts items, and produces a valid dataset', () => {
  expect(dataset.mapVersion).toBe('7.39b')
  expect(dataset.seededFrom).toBe('EvoHelper API sync, map 7.39b, 2026-10-04')
  expect(dataset.items.map(i => i.id)).toEqual(['deaths-edge', 'diamond', 'old-thing', 'ruby'])
  expect(validateDataset(dataset)).toEqual([])
})
