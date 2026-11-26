import test from 'node:test'
import assert from 'node:assert/strict'
import { codeFromRepo, toDataSuffix, fromDataSuffix } from '@celo/attribution-tags'
import { CODE, REPO_SLUG, assertCode, attributionSuffix, decodeSuffix } from '../src/attribution.mjs'

test('code is derived from the repo slug (sha256, first 12 hex)', () => {
  assert.equal(codeFromRepo(REPO_SLUG), 'celo_d03a2a1ad16b')
  assert.equal(CODE, 'celo_d03a2a1ad16b')
  assert.equal(assertCode(), 'celo_d03a2a1ad16b')
})

test('suffix round-trips through decode', () => {
  const suffix = attributionSuffix()
  assert.equal(typeof suffix, 'string')
  assert.ok(suffix.startsWith('0x'))
  const decoded = decodeSuffix(suffix)
  assert.deepEqual(decoded?.codes, ['celo_d03a2a1ad16b'])
})

test('toDataSuffix/fromDataSuffix agree with the SDK directly', () => {
  const suffix = toDataSuffix('celo_d03a2a1ad16b')
  assert.deepEqual(fromDataSuffix(suffix)?.codes, ['celo_d03a2a1ad16b'])
  // A suffix for another code must not decode to ours.
  const other = toDataSuffix('celo_test1234')
  assert.deepEqual(fromDataSuffix(other)?.codes, ['celo_test1234'])
})
