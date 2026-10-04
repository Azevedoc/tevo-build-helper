import { readSaveFolder } from './folder'

type Fake = { kind: 'file' | 'directory'; name: string; [k: string]: unknown }

const file = (name: string, text: string, lastModified: number): Fake => ({
  kind: 'file',
  name,
  getFile: async () => ({ name, lastModified, text: async () => text }),
})
const dir = (name: string, children: Fake[]): Fake => ({
  kind: 'directory',
  name,
  values: async function* () {
    yield* children
  },
})

test('reads the newest [Level N] save per class folder for each BattleTag', async () => {
  const root = dir('root', [
    dir('Tag#1', [
      dir('Paladin', [
        file('[Level 300].txt', 'old', 100),
        file('[Level 312].txt', 'new', 200),
        file('notes.txt', 'ignore', 999),
      ]),
      dir('Empty', []),
    ]),
    file('stray.txt', 'x', 1),
  ])
  const saves = await readSaveFolder(root as unknown as FileSystemDirectoryHandle)
  expect(saves).toEqual([{ battleTag: 'Tag#1', classFolder: 'Paladin', fileName: '[Level 312].txt', text: 'new' }])
})

test('a re-saved [Level 300] file (max level, overwritten in place) wins over older level files', async () => {
  const root = dir('root', [dir('Tag#1', [dir('Paladin', [file('[Level 299].txt', 'old', 100), file('[Level 300].txt', 'latest', 500)])])])
  const saves = await readSaveFolder(root as unknown as FileSystemDirectoryHandle)
  expect(saves.map(s => s.text)).toEqual(['latest'])
})
