import { parseSave, SaveParseError } from './parse-save'

import raw from './__fixtures__/paladin.txt?raw'

const fixture = raw.replace(/\r\n/g, '\n')

test('parses hero, level from file name and non-empty slots', () => {
  const save = parseSave(fixture, '[Level 312].txt')
  expect(save.hero).toBe('Paladin')
  expect(save.level).toBe(312)
  expect(save.slotNames).toEqual(['Hyperion', 'Glow Orb', 'Diamond', 'Ruby', 'Ruby'])
})

test('BOM and CRLF line endings parse identically', () => {
  const weird = '﻿' + fixture.replace(/\n/g, '\r\n')
  expect(parseSave(weird, '[Level 312].txt')).toEqual(parseSave(fixture, '[Level 312].txt'))
})

test('throws SaveParseError when there is no Hero line', () => {
  expect(() => parseSave('garbage\nmore garbage')).toThrow(SaveParseError)
})

test('level is null without a file name', () => {
  expect(parseSave(fixture).level).toBeNull()
})
