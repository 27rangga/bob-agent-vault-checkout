import test from 'node:test'
import assert from 'node:assert/strict'

// The seller module reads these at import time. Dummy values are fine:
// the 402 challenge is generated locally, no facilitator call happens
// until a payment is actually presented.
process.env.X402_API_KEY = 'test-dummy-key'
process.env.SELLER_PAY_TO = '0xe77E25b6430999eDB061Bfe47B9378320Cd88923' // Bob's Celo wallet
process.env.X402_NETWORK = 'testnet'

const { createApp } = await import('../src/seller.mjs')
const { CODE } = await import('../src/attribution.mjs')

test('GET /premium without payment returns 402 with the price + builder code', async () => {
  const app = createApp()
  const res = await app.request('/premium')
  assert.equal(res.status, 402)

  const header = res.headers.get('payment-required')
  assert.ok(header, '402 must carry a payment-required header')
  const challenge = JSON.parse(Buffer.from(header, 'base64').toString('utf8'))

  // x402 v2 challenge shape: amount/asset are top-level on the accept entry
  assert.equal(challenge.x402Version, 2)
  const accept = challenge.accepts[0]
  assert.equal(accept.scheme, 'exact')
  assert.equal(accept.network, 'eip155:11142220') // Celo Sepolia
  assert.equal(accept.amount, '10000') // $0.01 USDC
  assert.equal(accept.asset, '0x01C5C0122039549AD1493B8220cABEdD739BC44E')
  assert.deepEqual(accept.extra, { name: 'USDC', version: '2' })
  assert.equal(accept.payTo.toLowerCase(), '0xe77e25b6430999edb061bfe47b9378320cd88923')

  // Builder-code extension declares this project's attribution code.
  // Active code: site-issued celo_e07a8049a2b1 when ATTRIBUTION_CODE is set,
  // otherwise the repo-derived celo_d03a2a1ad16b.
  const ext = challenge.extensions?.['builder-code']
  assert.ok(ext, '402 must declare the builder-code extension')
  assert.equal(ext.info.a, CODE)
  assert.equal(ext.info.a, process.env.ATTRIBUTION_CODE ?? 'celo_d03a2a1ad16b')

  // The mirrored JSON body carries the same challenge.
  const body = await res.json()
  assert.equal(body.x402Version, 2)
  assert.equal(body.accepts[0].amount, '10000')
})
