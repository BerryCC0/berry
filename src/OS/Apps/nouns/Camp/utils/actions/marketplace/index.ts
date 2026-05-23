/**
 * NFT marketplace actions.
 *
 * Two earlier templates (opensea-listing, marketplace-fulfill-seaport) are
 * passthrough-calldata for BUYING from existing listings. The newer
 * templates below are for MAKING and CANCELLING orders, plus selling INTO
 * standing offers — each grounded in the Seaport tuple types in `_seaport.ts`.
 *
 * Order in the registry (set in actions/registry.ts):
 *   • Multi-action validate-based offers + listing
 *   • Multi-action fulfill (sells into offer)
 *   • Single-action cancel-one + cancel-all
 *   • Single-action passthroughs (opensea-listing, seaport-fulfill, blur)
 *
 * Decode for the validate-based templates is shared via _validate-pattern.ts,
 * which means any of them will decode an unknown validate(Order[]) call as
 * a generic "collection offer" (first registered wins). That's fine for
 * display; round-trip fidelity is preserved through the Order JSON field.
 */

export { blurExecuteTrade } from './blur-execute-trade';
export { openseaCancelAll } from './opensea-cancel-all';
export { openseaCancelOrder } from './opensea-cancel-order';
export { openseaCollectionOffer } from './opensea-collection-offer';
export { openseaFulfillOffer } from './opensea-fulfill-offer';
export { openseaItemOffer } from './opensea-item-offer';
export { openseaListNft } from './opensea-list-nft';
export { openseaListing } from './opensea-listing';
export { openseaTraitOffer } from './opensea-trait-offer';
export { seaportFulfill } from './seaport-fulfill';
