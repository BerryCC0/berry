/**
 * CC0 contribution agreement text generation for trait submissions.
 *
 * The artist signs `generateAgreementText(...)` via EIP-191 personal_sign.
 * The resulting signature + agreement text gets embedded in the proposal
 * description as a markdown block via `generateAgreementMarkdown(...)`. This
 * matches the format used by Noundry and seen in Nouns proposal 966.
 *
 * Attribution: format follows the public Nouns CC0 contribution agreement
 * archived on Arweave; clean-room TypeScript generator.
 */

export const NOUNS_CC0_AGREEMENT_URL =
  "https://ern3fbtsj23a2achuj5kqa4xtp2yvplqjy2r6cemo6ep52lfn2cq.arweave.net/JFuyhnJOtg0AR6J6qAOXm_WKvXBONR8IjHeI_ullboU";

export interface AgreementInput {
  /** ENS name or short address — displayed in the signed message and markdown. */
  signerName: string;
  signerAddress: `0x${string}`;
  contributionName: string;
  /** URL or short descriptor identifying what's being contributed. */
  contributionSpec: string;
}

/**
 * Generate the human-readable CC0 agreement that the artist signs via
 * EIP-191 personal_sign. The signature commits the signer to the exact byte
 * string returned by this function — adding/changing whitespace will break
 * any later verification, so callers should pass this string to the wallet
 * unmodified.
 */
export function generateAgreementText(input: AgreementInput): string {
  const { signerName, signerAddress, contributionName, contributionSpec } =
    input;

  return [
    `I, ${signerName} (${signerAddress}), irrevocably contribute the following work to the public domain under the Nouns CC0 Contribution Agreement:`,
    ``,
    `Contribution: ${contributionName}`,
    `Specification: ${contributionSpec}`,
    ``,
    `By signing this message I confirm that:`,
    `1. I am the sole author of the contribution, or have full authority to license it.`,
    `2. I waive all copyright and related rights in the contribution worldwide, to the maximum extent permitted by law, under the Creative Commons CC0 1.0 Universal Public Domain Dedication.`,
    `3. I make this dedication for the benefit of the Nouns DAO ecosystem and the general public, with no expectation of compensation or attribution.`,
    ``,
    `Full agreement: ${NOUNS_CC0_AGREEMENT_URL}`,
  ].join("\n");
}

/**
 * Generate the markdown block (with table) that gets injected into the
 * proposal description, capturing the signed agreement so that on-chain
 * voters can verify the artist's intent.
 */
export function generateAgreementMarkdown(
  input: AgreementInput & { signature: `0x${string}` }
): string {
  const {
    signerName,
    signerAddress,
    contributionName,
    contributionSpec,
    signature,
  } = input;

  const text = generateAgreementText(input);

  return [
    `## CC0 Contribution Agreement`,
    ``,
    `| Field | Value |`,
    `| --- | --- |`,
    `| Signer | ${signerName} |`,
    `| Address | \`${signerAddress}\` |`,
    `| Contribution | ${contributionName} |`,
    `| Specification | ${contributionSpec} |`,
    `| Agreement | [${NOUNS_CC0_AGREEMENT_URL}](${NOUNS_CC0_AGREEMENT_URL}) |`,
    `| Signature | \`${signature}\` |`,
    ``,
    `<details>`,
    `<summary>Signed message</summary>`,
    ``,
    `\`\`\``,
    text,
    `\`\`\``,
    ``,
    `</details>`,
  ].join("\n");
}
