/**
 * OpenSeaCancelAllEditor
 *
 * Confirmation pane for `opensea-cancel-all`. The action takes no fields —
 * it always emits `Seaport.incrementCounter()`. The editor exists to make
 * the consequence obvious: this kills EVERY active OpenSea order the
 * treasury has.
 *
 * Future enhancement: fetch the current open-order count from OpenSea's API
 * and surface it ("This will cancel 3 open orders"). Requires API auth, so
 * deferred until the OpenSea API integration phase.
 */

'use client';

import styles from './OpenSeaCancelAllEditor.module.css';

export function OpenSeaCancelAllEditor() {
  return (
    <div className={styles.editor}>
      <div className={styles.warningCard}>
        <div className={styles.warningHeader}>⚠ Cancels every open OpenSea order</div>
        <div className={styles.warningBody}>
          On execution, this proposal calls{' '}
          <span className={styles.codeRef}>Seaport.incrementCounter()</span> for
          the treasury. Every order the treasury has currently authorised on
          OpenSea (collection offers, item offers, listings, anything else)
          becomes invalid in a single transaction. There is no undo.
        </div>
      </div>
      <p className={styles.detailLine}>
        This is the emergency button — use it when a misconfigured order
        could be exploited, or when bulk-clearing stale orders is faster than
        cancelling them one at a time. To cancel only specific orders,
        choose the &ldquo;Cancel Specific OpenSea Order&rdquo; template instead.
      </p>
      <p className={styles.detailLine}>
        Counter increments are cheap (~25k gas) but each order created after
        this proposal executes will use the new counter — any in-flight
        order constructions referencing the old counter will be invalid and
        need to be rebuilt.
      </p>
    </div>
  );
}
