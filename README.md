# Bob — Agent Vault checkout on Celo

An AI agent that **signs into regular websites via Agent Vault** and **pays
onchain with x402 on Celo** — built for the Celo **"Agents Open for
Business"** hackathon, **Agent Vault track**.

Track requirement (from loops.house): *"Agents that sign in, check out, and
pay on regular websites with Agent Vault, without seeing the card or
password, and pay onchain with x402."* Signing into a regular website
through Agent Vault meets the track requirement; a card checkout is optional.

## What this agent does

```
Bob (agent, ERC-8004 identity pending — see Status)
  1. Connects to Agent Vault via MCP (streamable HTTP + OAuth)
  2. Reads the token catalog — mock tokens only, e.g. av_login_1_...
  3. Signs into a regular website with a saved login token
     (the vault proxy fills the real password at the last moment;
      the agent never sees it)
  4. Pays for a paid API with x402 on Celo (USDC, EIP-3009, gasless:
     the facilitator settles and pays gas), capped at $0.05/payment
  5. Every payment carries this project's attribution code
     (builder-code extension + ERC-8021 suffix)
```

## Attribution

- Repo: `27rangga/bob-agent-vault-checkout`
- Active code: **`celo_e07a8049a2b1`** — assigned by loops.house at registration
  (26 Nov 2026); set via `ATTRIBUTION_CODE` in `.env`.
- Repo-derived code: `celo_d03a2a1ad16b` — `sha256("27rangga/bob-agent-vault-checkout")[:12]`,
  the fallback when `ATTRIBUTION_CODE` is unset.
- The code is asserted at startup (`src/attribution.mjs`): the active code is
  used when set, otherwise the derived code must match the repo slug.

## Files

| File | What |
| --- | --- |
| `src/agent.mjs` | The job: Vault sign-in → x402 payment → receipt |
| `src/agent-vault.mjs` | Agent Vault MCP client (catalog, tool discovery, sign-in) |
| `src/buyer.mjs` | x402 paying client (`@x402/fetch` + `@x402/evm`, spend-capped) |
| `src/seller.mjs` | Example paid API ($0.01 USDC, builder-code extension declared) |
| `src/config.mjs` | Network config (Sepolia default, mainnet via env) + wallet loader |
| `src/attribution.mjs` | ERC-8021 code derivation + suffix helpers |
| `src/facilitator.mjs` | Facilitator client (API key from env, seller side) |
| `src/check.mjs` | Keyless preflight (facilitator reachable, USDC has code) |
| `test/` | Offline tests: attribution round-trip, EIP-3009 signing, 402 challenge |

## Quickstart

```bash
npm install
cp .env.example .env
chmod 600 .env
npm run check    # no keys needed
npm test         # 7 offline tests
```

Then fill in `.env` (see `.env.example`):

- `X402_API_KEY` — create at https://x402.celo.org (connect wallet, sign, no gas).
- `SELLER_PAY_TO` — address that receives the USDC the seller charges.
- `BOB_WALLET_FILE` — Bob's own Celo wallet (created for this project;
  lives outside this repo, mode 600; only the address is ever printed).
- `AGENT_VAULT_MCP_URL` — copy the per-account connect line from the
  Agent Vault dashboard (Overview → Connect another agent). Never guess it.
- `VAULT_SIGNIN_URL` / `VAULT_LOGIN_TOKEN` — a login saved in the vault
  by the account owner, and the mock token (`av_login_...`) from the catalog.

```bash
npm run seller   # paid API on http://localhost:3000
npm run buyer    # pays for it, prints the settlement tx
npm run agent    # the full job: sign in + pay
```

The buyer needs a little USDC on the chosen network and **no CELO**
(the facilitator pays gas). On Sepolia, USDC comes from the Circle faucet
(faucet.circle.com). The buyer refuses any payment above
`BUYER_MAX_PER_PAYMENT` (default `$0.05`).

## Status — 26 Nov 2026 (honest)

| Item | State |
| --- | --- |
| Public repo + code | ✅ Done — this repo |
| Attribution code `celo_e07a8049a2b1` (site-issued) | ✅ Active + asserted + tested (repo-derived `celo_d03a2a1ad16b` is the fallback) |
| x402 seller ($0.01, builder-code in 402) | ✅ Done + tested offline (7/7) |
| x402 buyer (spend-capped, builder code attached) | ✅ Done; live payment not yet run |
| Live preflight (Sepolia facilitator + USDC) | ✅ OK 26 Nov (facilitator 200, USDC has code) |
| EIP-3009 signing (Bob's wallet, offline) | ✅ Verified — signature recovers to Bob |
| ERC-8004 agent identity (mint) | ⛔ **Blocked — no gas.** The Celo faucet's relayer is out of CELO (0.048 CELO on 26 Nov); every claim reverts. No funds were taken from anyone. Retry when the faucet is refilled. |
| AskBots registration | ✅ Account created (agentId `kn72zer94ysv5pgp116vsqb3d98jz5cs`); profile + reviews blocked on the ERC-8004 mint + empty project queue (`GET /api/projects` → `[]` on 26 Nov). |
| Agent Vault account + login in vault | ⏳ **Needs the human (RANGGA).** Only the account owner can create the vault account, save a login/card, and choose what the agent may use. The agent never handles the real password. |
| x402 API key | ⏳ **Needs the human (RANGGA).** Create at x402.celo.org (connect wallet + sign, no gas). |
| loops.house enrollment | ⏳ **Needs a browser sign-in.** Registration is a web form behind login (`/login?next=.../enroll`); no public API was found. |
| Live end-to-end payment (Sepolia) | ⏳ Needs the API key + a little Sepolia USDC for the buyer wallet. |

## Money spent

**0 from RANGGA.** No wallet of RANGGA's was used for anything. Bob's own
Celo wallet (`0xe77E25b6430999eDB061Bfe47B9378320Cd88923`) holds 0 CELO and
0 USD₮ — the faucet claims failed, so nothing was ever funded. No purchase,
no KYC, no signature from RANGGA was requested or made.

## Security notes

- Bob's wallet file is outside this repo and git-ignored; the private key
  and mnemonic are never printed or committed.
- The buyer only pays the exact route the seller advertises, under a
  per-payment cap; the facilitator never holds funds (USDC moves
  buyer → `payTo` inside the token contract).
- Agent Vault mock tokens are useless outside the proxy; a stolen token
  works only inside the proxy, for the account that owns it.
- USDT/USAT EIP-712 domains are taken from the x402 table (`Tether USD` /
  `Tether America USD`, version `1`) — never the symbol, never read from
  the contract at runtime (both revert on `version()`).

## License

MIT.
