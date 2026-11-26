/**
 * Bob's job, end to end (Agent Vault track):
 *
 *  1. Connect to Agent Vault (MCP) and read the token catalog — the mock
 *     tokens the account owner allowed for this agent.
 *  2. Sign into a regular website through Agent Vault with a saved login
 *     token. The agent never sees the real password; the vault proxy fills
 *     it at the last moment. (Signing in meets the track requirement; a
 *     card checkout is optional.)
 *  3. Pay for a paid API with x402 on Celo (buyer flow), capped at
 *     BUYER_MAX_PER_PAYMENT, with this project's builder code attached.
 *
 * Steps that need a human are NOT skipped silently: if the Agent Vault URL
 * is missing, or no login token is configured, the agent prints exactly
 * what is missing and exits non-zero.
 */
import { connectAgentVault, getTokenCatalog, signInWithVault } from './agent-vault.mjs'
import { createPaidFetch } from './buyer.mjs'
import { CFG, SELLER_URL } from './config.mjs'

const signInUrl = process.env.VAULT_SIGNIN_URL
const loginToken = process.env.VAULT_LOGIN_TOKEN

if (!signInUrl || !loginToken) {
  console.error(
    'Missing VAULT_SIGNIN_URL / VAULT_LOGIN_TOKEN. The account owner must save a login ' +
    'in the Agent Vault dashboard and allow this agent to use it (Connected apps -> Choose access), ' +
    'then put the mock token (av_login_...) in .env. The real password is never typed here.'
  )
  process.exit(1)
}

const client = await connectAgentVault()
console.log('Connected to Agent Vault MCP.')

const catalog = await getTokenCatalog(client)
console.log('Token catalog:', JSON.stringify(catalog).slice(0, 500))

const signIn = await signInWithVault(client, { url: signInUrl, loginToken })
console.log(`Signed in to ${signInUrl} via Agent Vault tool "${signIn.tool}".`)
console.log('Sign-in result:', JSON.stringify(signIn.result).slice(0, 500))

const { payFetch, account } = createPaidFetch()
console.log(`Paying ${SELLER_URL} as ${account.address} on ${CFG.label}.`)
const res = await payFetch(SELLER_URL)
console.log('Paid API status:', res.status)
console.log('Paid API body:', await res.json())
const header = res.headers.get('payment-response')
if (header) {
  const settled = JSON.parse(Buffer.from(header, 'base64').toString('utf8'))
  if (settled?.transaction) console.log('Settlement tx:', CFG.explorerTx + settled.transaction)
}
if (res.status !== 200) process.exit(1)
console.log('Job done: signed in via Agent Vault + paid via x402 on Celo.')
await client.close()
