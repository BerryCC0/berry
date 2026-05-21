/**
 * ENS Contract Addresses (Ethereum Mainnet)
 *
 * Verified from https://docs.ens.domains/learn/deployments
 * Cross-reference with Etherscan before relying on these for writes.
 */

export const ENS_ADDRESSES = {
  registry: '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e' as const,
  baseRegistrar: '0x57f1887a8BF19b14fC0dF6Fd9B2acc9Af147eA85' as const,
  ethRegistrarController: '0x59E16fcCd424Cc24e280Be16E11Bcd56fb0CE547' as const,
  publicResolver: '0xF29100983E058B709F3D539b0c765937B804AC15' as const,
  universalResolver: '0xeEeEEEeE14D718C2B47D9923Deab1335E144EeEe' as const,
  reverseRegistrar: '0xa58E81fe9b61B5c3fE2AFD33CF304c454AbFc7Cb' as const,
  defaultReverseRegistrar: '0x283F227c4Bd38ecE252C4Ae7ECE650B0e913f1f9' as const,
  nameWrapper: '0xD4416b13d2b3a9aBae7AcD5D6C2BbDBE25686401' as const,
  dnsRegistrar: '0xB32cB5677a7C971689228EC835800432B339bA2B' as const,
  extendedDnsResolver: '0x238A8F792dFA6033814B18618aD4100654aeef01' as const,
} as const;

export type EnsContractName = keyof typeof ENS_ADDRESSES;

export const ENS_METADATA_BASE = 'https://metadata.ens.domains/mainnet';

export function ensAvatarUrl(name: string): string {
  return `${ENS_METADATA_BASE}/avatar/${encodeURIComponent(name)}`;
}
