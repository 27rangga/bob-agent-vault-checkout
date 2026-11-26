/**
 * Agent Vault connection (MCP, streamable HTTP + OAuth).
 *
 * How this works, per docs.agentvault.io:
 *  1. The account owner creates an Agent Vault account and adds the cards /
 *     logins the agent may use (dashboard). A new connection starts with
 *     NOTHING granted.
 *  2. The owner copies the per-account "connect" line from the dashboard
 *     (Overview -> Connect another agent) and gives this agent the MCP
 *     server URL (AGENT_VAULT_MCP_URL). The agent signs in once in the
 *     browser (OAuth); there is no API key to copy.
 *  3. The agent's first tool call is `get_token_catalog`. That call creates
 *     the connection on the dashboard under "Connected apps"; the owner then
 *     clicks "Choose access" and picks which cards/logins the agent may use.
 *  4. After that, the agent only ever sees mock tokens such as
 *     `av_card_1_number_u7x2k` — never the real card number or password.
 *     The vault proxy swaps the token for the real value at the moment of
 *     the fill, inside the merchant page.
 *
 * This module implements steps 3-4 against the live MCP server: it connects,
 * calls get_token_catalog, discovers the server's tools at runtime, and
 * invokes the sign-in tool the server offers for a saved login. Tool names
 * beyond get_token_catalog are discovered, not hardcoded, because the
 * server's tool surface is versioned with the dashboard.
 *
 * Requires: AGENT_VAULT_MCP_URL (from the dashboard). Without it, this
 * module refuses to run — the URL is per-account and must never be guessed.
 */
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'

export async function connectAgentVault(mcpUrl = process.env.AGENT_VAULT_MCP_URL) {
  if (!mcpUrl) {
    throw new Error(
      'Missing AGENT_VAULT_MCP_URL. Copy the connect line from the Agent Vault dashboard ' +
      '(Overview -> Connect another agent) and set it in .env. The URL is per-account; do not guess it.'
    )
  }
  const client = new Client({ name: 'bob-agent-vault-checkout', version: '0.1.0' }, { capabilities: {} })
  const transport = new StreamableHTTPClientTransport(new URL(mcpUrl))
  await client.connect(transport)
  return client
}

/** First call: returns the mock tokens the owner allowed for this agent. */
export async function getTokenCatalog(client) {
  const result = await client.callTool({ name: 'get_token_catalog', arguments: {} })
  return result
}

/** List the tools this Agent Vault server offers (discovered at runtime). */
export async function listVaultTools(client) {
  const result = await client.listTools()
  return result.tools.map((t) => t.name)
}

/**
 * Sign into a regular website with a saved login token from the catalog.
 * The tool that performs the sign-in is picked from the server's own tool
 * list at runtime (names are versioned with the dashboard); if the server
 * offers no sign-in tool, this throws with the discovered list attached
 * instead of pretending the sign-in happened.
 */
export async function signInWithVault(client, { url, loginToken }) {
  const tools = await listVaultTools(client)
  const signInTool = tools.find((t) => /sign.?in|login|fill/i.test(t))
  if (!signInTool) {
    const error = new Error(`Agent Vault server offers no sign-in tool (tools: ${tools.join(', ') || 'none'})`)
    error.tools = tools
    throw error
  }
  const result = await client.callTool({
    name: signInTool,
    arguments: { url, login: loginToken },
  })
  return { tool: signInTool, result }
}
