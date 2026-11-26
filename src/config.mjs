/**
 * Shared network config. Celo Sepolia by default; set X402_NETWORK=mainnet
 * for Celo mainnet. Addresses are the USDC tokens (6 decimals), checked
 * against the x402 Celo skill table.
 *
 * Load .env when present (Node >= 20.12); variables already set in the
 * environment win.
 */
import { getAddress } from 'viem'

try {
  process.loadEnvFile()
} catch (error) {
  if (error.code !== 'ENOENT') throw error
}

export const NETWORKS = {
  testnet: {
    caip2: 'eip155:11142220', // Celo Sepolia
    usdc: getAddress('0x01C5C0122039549AD1493B8220cABEdD739BC44E'), // USDC, 6 decimals
    label: 'Celo Sepolia',
    rpc: 'https://forno.celo-sepolia.celo-testnet.org',
    facilitator: 'https://api.x402.sepolia.celo.org',
    explorerTx: 'https://celo-sepolia.blockscout.com/tx/',
  },
  mainnet: {
    caip2: 'eip155:42220', // Celo mainnet
    usdc: getAddress('0xcebA9300f2b948710d2653dD7B07f33A8B32118C'), // USDC, 6 decimals
    usdt: getAddress('0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e'), // USDT, 6 decimals
    label: 'Celo mainnet',
    rpc: 'https://forno.celo.org',
    facilitator: 'https://api.x402.celo.org',
    explorerTx: 'https://celoscan.io/tx/',
  },
}

export const NET = (process.env.X402_NETWORK === 'mainnet' ? 'mainnet' : 'testnet')
export const CFG = NETWORKS[NET]
export const PORT = Number(process.env.PORT ?? 3000)
export const SELLER_URL = process.env.SELLER_URL ?? `http://localhost:${PORT}/premium`
export const BUYER_MAX_PER_PAYMENT = process.env.BUYER_MAX_PER_PAYMENT ?? '$0.05'

/**
 * Bob's Celo wallet. The wallet file lives OUTSIDE this repo
 * (~/workspace/celo/bob-celo-wallet.json, mode 600) and is never committed.
 * Only the address is ever printed; the private key stays in memory.
 */
import { readFileSync } from 'node:fs'

export function loadBobWallet() {
  const file = process.env.BOB_WALLET_FILE ?? '/home/hatch/workspace/celo/bob-celo-wallet.json'
  const raw = JSON.parse(readFileSync(file, 'utf8'))
  if (!raw.privateKey || !raw.address) {
    throw new Error(`Wallet file ${file} is missing address/privateKey`)
  }
  return { address: getAddress(raw.address), privateKey: raw.privateKey }
}
