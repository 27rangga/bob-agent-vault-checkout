import test from 'node:test'
import assert from 'node:assert/strict'
import { codeFromRepo, toDataSuffix, fromDataSuffix } from '@celo/attribution-tags'
import { CODE, REPO_SLUG, assertCode, attributionSuffix, decodeSuffix } from '../src/attribution.mjs'

test('code is derived from the repo slug (sha256, first 12 hex)', () => {
  assert.equal(codeFromRepo(REPO_SLUG), 'celo_d03a2a1ad16b')
  // Active code: the site-issued code when ATTRIBUTION_CODE is set
  // (loops.house registration, 26 Nov 2026: celo_e07a8049a2b1),
  // otherwise the repo-derived code.
  const expected = process.env.ATTRIBUTION_CODE ?? 'celo_d03a2a1ad16b'
  assert.equal(CODE, expected)
  assert.equal(assertCode(), expected)
})

test('suffix round-trips through decode', () => {
  const suffix = attributionSuffix()
  assert.equal(typeof suffix, 'string')
  assert.ok(suffix.startsWith('0x'))
  const decoded = decodeSuffix(suffix)
  const expected = process.env.ATTRIBUTION_CODE ?? 'celo_d03a2a1ad16b'
  assert.deepEqual(decoded?.codes, [expected])
})

test('toDataSuffix/fromDataSuffix agree with the SDK directly', () => {
  const suffix = toDataSuffix('celo_d03a2a1ad16b')
  assert.deepEqual(fromDataSuffix(suffix)?.codes, ['celo_d03a2a1ad16b'])
  // A suffix for another code must not decode to ours.
  const other = toDataSuffix('celo_test1234')
  assert.deepEqual(fromDataSuffix(other)?.codes, ['celo_test1234'])
})
