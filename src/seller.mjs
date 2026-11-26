/**
 * Seller: charge $0.01 in USDC for an API endpoint on Celo.
 *
 * Run:  npm run seller
 * Then: curl -i http://localhost:3000/premium   (402 until paid)
 *
 * The route declares the builder-code extension with this project's
 * attribution code (celo_d03a2a1ad16b): the x402 builder-code extension is
 * picked up automatically by the facilitator once its Schema 2 tagging
 * ships, and the 402 response already carries the code today.
 * The token and its EIP-712 domain are named explicitly — never a bare
 * "$0.01" price, which silently resolves to USDC whatever you meant.
 */
import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { paymentMiddleware, x402ResourceServer } from '@x402/hono'
import { ExactEvmScheme } from '@x402/evm/exact/server'
import { declareBuilderCodeExtension } from '@x402/extensions/builder-code'
import { getAddress } from 'viem'
import { facilitator } from './facilitator.mjs'
import { CFG, PORT } from './config.mjs'
import { CODE, assertCode } from './attribution.mjs'

if (!process.env.X402_API_KEY) {
  console.error('Missing X402_API_KEY. Create one at https://x402.celo.org and put it in .env')
  process.exit(1)
}
if (!process.env.SELLER_PAY_TO) {
  console.error('Missing SELLER_PAY_TO: the address that receives the USDC.')
  process.exit(1)
}
assertCode()

const server = new x402ResourceServer(facilitator)
server.register('eip155:*', new ExactEvmScheme())

export const routes = {
  'GET /premium': {
    accepts: [
      {
        scheme: 'exact',
        network: CFG.caip2,
        payTo: getAddress(process.env.SELLER_PAY_TO),
        price: {
          amount: '10000', // $0.01: USDC has 6 decimals, and the amount is always a string
          asset: CFG.usdc,
          extra: { name: 'USDC', version: '2' }, // EIP-712 domain, must match the token
        },
      },
    ],
    description: 'Premium content — one x402-paid read',
    extensions: {
      // App builder code for this project; service codes are merged in by
      // the buyer's client extension (see src/buyer.mjs).
      'builder-code': declareBuilderCodeExtension(CODE),
    },
  },
}

export function createApp() {
  const app = new Hono()
  // Mirror the 402 challenge into the response body too, so body-reading
  // clients and crawlers see it, not only the payment-required header.
  app.use(async (c, next) => {
    await next()
    if (c.res.status === 402) {
      const header = c.res.headers.get('payment-required')
      if (header) {
        const body = Buffer.from(header, 'base64').toString('utf8')
        c.res = new Response(body, {
          status: 402,
          headers: { 'content-type': 'application/json', 'payment-required': header },
        })
      }
    }
  })
  app.use(paymentMiddleware(routes, server)) // routes first, then server
  app.get('/premium', (c) => c.json({ data: 'this response cost $0.01' }))
  return app
}

if (process.argv[1]?.endsWith('seller.mjs')) {
  serve({ fetch: createApp().fetch, port: PORT })
  console.log(`Seller listening on http://localhost:${PORT} (${CFG.label}), code ${CODE}`)
}
