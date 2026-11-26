/**
 * Attribution tag for this project (ERC-8021, via @celo/attribution-tags).
 *
 * The hackathon assigns the code at registration, derived from the GitHub
 * repository slug. This repo is 27rangga/bob-agent-vault-checkout, so:
 *
 *   printf "%s" "27rangga/bob-agent-vault-checkout" | sha256sum | cut -c1-12
 *   -> d03a2a1ad16b   => code "celo_d03a2a1ad16b"
 *
 * The code is asserted against the repo slug at startup (see assertCode):
 * a copied or stale code tags transactions that credit nobody, and nothing
 * on-chain tells you. Loops House assigned a different code at registration
 * (26 Nov 2026): celo_e07a8049a2b1 — set ATTRIBUTION_CODE to that value;
 * the repo-derived code remains the fallback when ATTRIBUTION_CODE is unset.
 * The x402 builder-code extension carries only the active CODE (one code);
 * the derived code is not also attached.
 */
import { codeFromRepo, toDataSuffix, fromDataSuffix } from '@celo/attribution-tags'

export const REPO_SLUG = '27rangga/bob-agent-vault-checkout'
export const CODE = process.env.ATTRIBUTION_CODE ?? codeFromRepo(REPO_SLUG)

/** Throws if the derived code does not match the repo slug. Run at startup. */
export function assertCode() {
  const derived = codeFromRepo(REPO_SLUG)
  if (CODE !== derived && !process.env.ATTRIBUTION_CODE) {
    throw new Error(`attribution code ${CODE} does not match repo ${REPO_SLUG} (expected ${derived})`)
  }
  return CODE
}

/** Encoded ERC-8021 suffix for the project code (append to transaction calldata). */
export function attributionSuffix(codes = [CODE]) {
  return toDataSuffix(codes)
}

/** Decode a suffix back to its codes (used by tests and verification). */
export function decodeSuffix(suffix) {
  return fromDataSuffix(suffix)
}
