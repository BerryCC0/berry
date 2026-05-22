/**
 * NFT marketplace actions — both produce identical calldata shape (target +
 * ETH value + raw calldata) but use different editors. Neither decodes via
 * the registry; Seaport calls are recognised at the transactionDecoder
 * selector-pattern level instead.
 */

export { openseaListing } from './opensea-listing';
export { seaportFulfill } from './seaport-fulfill';
