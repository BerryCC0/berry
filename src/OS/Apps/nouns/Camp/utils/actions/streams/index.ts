/**
 * Streams domain. Order matters in the registry:
 *   • paymentStream and streamRestream go FIRST (multi-action: 2 and 4 actions).
 *   • streamRestream specifically must come BEFORE streamCancel — its first
 *     two actions are byte-identical to a stream-cancel.
 *   • streamCancel and streamRedirect are mutually exclusive on destination,
 *     so their relative order doesn't matter.
 */

export { paymentStream } from './payment-stream';
export { streamRestream } from './restream';
export { streamCancel } from './cancel';
export { streamRedirect } from './redirect';
