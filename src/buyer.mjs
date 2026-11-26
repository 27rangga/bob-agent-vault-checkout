/**
 * Buyer: pay for the seller's endpoint automatically.
 *
 * Start the seller first (npm run seller), then run: npm run buyer
 *
 * The buyer wallet needs a little USDC on the chosen network and no CELO:
 * the facilitator submits the transaction and pays the gas. The buyer does
 * NOT need a facilitator API key.
 *
 * Spend controls: the buyer refuses any payment above BUYER_MAX_PER_PAYMENT
 * (default $0.05) and only pays the USDC route the seller advertises.
 * The buyer also attaches this project's builder code as a client service
 * code, so the settlement is attributable to this agent.
 */
import { x402Client, wrapFetchWithPayment } from '@x402/fetch'
import { ExactEvmScheme } from '@x402/evm/exact/client'
import { BuilderCodeClientExtension } from '@x402/extensions/builder-code'
import { privateKeyToAccount } from 'viem/accounts'
import { CFG, SELLER_URL, BUYER_MAX_PER_PAYMENT, loadBobWallet } from './config.mjs'
import { CODE, assertCode } from './attribution.mjs'

export function createPaidFetch() {
  const { address, privateKey } = loadBobWallet()
  const account = privateKeyToAccount((privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`))
  if (account.address.toLowerCase() !== address.toLowerCase()) {
    throw new Error(`Wallet file address ${address} does not match private key (${account.address})`)
  }
  assertCode()

  const client = new x402Client()
  client.registerExtension(new BuilderCodeClientExtension(CODE))
  // setSpendControls, NOT the constructor: new x402Client(config) silently
  // ignores a config object. Atomic cap for this route's asset + USD cap.
  client.setSpendControls({
    allowedAssets: [{ network: CFG.caip2, asset: CFG.usdc, maxAmountPerPayment: '50000' }],
    maxAmountPerPayment: BUYER_MAX_PER_PAYMENT,
  })
  // Give the scheme a way to READ the chain as well as sign: the permit
  // branch reads allowance/nonce before signing, so pass { rpcUrl }.
  client.register('eip155:*', new ExactEvmScheme(account, { rpcUrl: CFG.rpc }))
  return { payFetch: wrapFetchWithPayment(fetch, client), account }
}

if (process.argv[1]?.endsWith('buyer.mjs')) {
  const { payFetch, account } = createPaidFetch()
  console.log(`Paying ${SELLER_URL} as ${account.address} on ${CFG.label} (cap ${BUYER_MAX_PER_PAYMENT})`)
  const res = await payFetch(SELLER_URL)
  console.log('status:', res.status)
  console.log('body:', await res.json())

  // The settlement transaction hash is in the payment-response header.
  const header = res.headers.get('payment-response')
  if (header) {
    const settled = JSON.parse(Buffer.from(header, 'base64').toString('utf8'))
    const tx = settled?.transaction
    if (tx) console.log('settlement tx:', CFG.explorerTx + tx)
  }
  if (res.status !== 200) process.exit(1)
}
