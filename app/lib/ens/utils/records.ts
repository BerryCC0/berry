/**
 * Standard ENS text record keys we surface in the UI.
 * See https://docs.ens.domains/web/records for the full taxonomy.
 */

export const ENS_TEXT_KEYS = {
  avatar: 'avatar',
  description: 'description',
  display: 'display',
  email: 'email',
  keywords: 'keywords',
  mail: 'mail',
  notice: 'notice',
  location: 'location',
  phone: 'phone',
  url: 'url',
  github: 'com.github',
  twitter: 'com.twitter',
  farcaster: 'xyz.farcaster',
  telegram: 'org.telegram',
  discord: 'com.discord',
  reddit: 'com.reddit',
} as const;

export type EnsTextKey = keyof typeof ENS_TEXT_KEYS;

export const ENS_COIN_TYPES = {
  eth: 60,
  btc: 0,
  ltc: 2,
  doge: 3,
  sol: 501,
  base: 2147492101,
  optimism: 2147483658,
  arbitrum: 2147525809,
  polygon: 2147483785,
} as const;

export type EnsCoinType = keyof typeof ENS_COIN_TYPES;
