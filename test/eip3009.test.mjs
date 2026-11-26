import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { Wallet, verifyTypedData } from 'ethers'

// Offline test: build + sign a USDC EIP-3009 transferWithAuthorization
// exactly as the x402 exact scheme does, and verify the signature recovers
// to Bob's wallet. Nothing is broadcast; no gas, no funds move.
const walletFile = JSON.parse(readFileSync('/home/hatch/workspace/celo/bob-celo-wallet.json', 'utf8'))
const wallet = new Wallet(walletFile.privateKey)

const USDC_MAINNET = '0xcebA9300f2b948710d2653dD7B07f33A8B32118C'
const USDC_SEPOLIA = '0x01C5C0122039549AD1493B8220cABEdD739BC44E'

function domain(chainId, verifyingContract) {
  // EIP-712 domain for USDC transferWithAuthorization (from the x402 table:
  // name "USDC", version "2"; never read from the contract at runtime).
  return { name: 'USDC', version: '2', chainId, verifyingContract }
}

const types = {
  TransferWithAuthorization: [
    { name: 'from', type: 'address' },
    { name: 'to', type: 'address' },
    { name: 'value', type: 'uint256' },
    { name: 'validAfter', type: 'uint256' },
    { name: 'validBefore', type: 'uint256' },
    { name: 'nonce', type: 'bytes32' },
  ],
}

test('EIP-3009 authorization signature recovers to Bob (mainnet USDC)', async () => {
  const value = {
    from: wallet.address,
    to: '0x0000000000000000000000000000000000000001',
    value: 10000n, // $0.01 USDC, 6 decimals
    validAfter: 0n,
    validBefore: 1795574400n, // 2026-12-31
    nonce: '0x' + 'ab'.repeat(32),
  }
  const sig = await wallet.signTypedData(domain(42220, USDC_MAINNET), types, value)
  const recovered = verifyTypedData(domain(42220, USDC_MAINNET), types, value, sig)
  assert.equal(recovered.toLowerCase(), wallet.address.toLowerCase())
  assert.equal(wallet.address.toLowerCase(), walletFile.address.toLowerCase())
})

test('EIP-3009 authorization signature recovers to Bob (Sepolia USDC)', async () => {
  const value = {
    from: wallet.address,
    to: '0x0000000000000000000000000000000000000001',
    value: 10000n,
    validAfter: 0n,
    validBefore: 1795574400n,
    nonce: '0x' + 'cd'.repeat(32),
  }
  const sig = await wallet.signTypedData(domain(11142220, USDC_SEPOLIA), types, value)
  const recovered = verifyTypedData(domain(11142220, USDC_SEPOLIA), types, value, sig)
  assert.equal(recovered.toLowerCase(), wallet.address.toLowerCase())
})

test('wrong domain name must NOT verify (USDT signs as "Tether USD", not the symbol)', async () => {
  const value = {
    from: wallet.address,
    to: '0x0000000000000000000000000000000000000001',
    value: 10000n,
    validAfter: 0n,
    validBefore: 1795574400n,
    nonce: '0x' + 'ab'.repeat(32),
  }
  const sig = await wallet.signTypedData(domain(42220, USDC_MAINNET), types, value)
  const wrongDomain = { name: 'USDT', version: '1', chainId: 42220, verifyingContract: USDC_MAINNET }
  const recovered = verifyTypedData(wrongDomain, types, value, sig)
  assert.notEqual(recovered.toLowerCase(), wallet.address.toLowerCase())
})
