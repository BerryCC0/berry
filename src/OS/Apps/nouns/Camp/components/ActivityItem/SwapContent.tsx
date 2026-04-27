/**
 * $nouns NFTBackedToken swap activity content.
 * Handles: noun_swap (kind = 'swap' | 'deposit' | 'redeem')
 *
 * Single contract, three event shapes:
 *   - swap:    user trades Noun(s) IN for Noun(s) OUT (equal counts)
 *   - deposit: user sends Noun(s) IN, mints $nouns ERC-20
 *   - redeem:  user burns $nouns, withdraws Noun(s) OUT
 */

'use client';

import { NounImageById } from '@/app/lib/nouns/components';
import { ActorName } from './SharedRenderers';
import type { ActivityContentProps } from './types';
import styles from './ActivityItem.module.css';

const POOL_LABEL = '$nouns pool';

function NounThumbs({ ids }: { ids: string[] }) {
  return (
    <>
      {ids.map(id => (
        <NounImageById key={id} id={parseInt(id, 10)} size={22} className={styles.nounImageInline} />
      ))}
    </>
  );
}

export function SwapContent(props: ActivityContentProps) {
  const { item, displayName, actorAvatar, onClickActor } = props;

  const tokensIn = item.nounIdsIn ?? [];
  const tokensOut = item.nounIdsOut ?? [];
  const kind = item.swapKind ?? 'swap';

  if (kind === 'swap') {
    // user swapped [A,B] for [C,D]
    return (
      <div className={styles.header}>
        <ActorName avatar={actorAvatar} address={item.actor} name={displayName} onClick={onClickActor} />
        <span className={styles.action}>swapped</span>
        <NounThumbs ids={tokensIn} />
        <span className={styles.action}>for</span>
        <NounThumbs ids={tokensOut} />
      </div>
    );
  }

  if (kind === 'deposit') {
    return (
      <div className={styles.header}>
        <ActorName avatar={actorAvatar} address={item.actor} name={displayName} onClick={onClickActor} />
        <span className={styles.action}>deposited</span>
        <NounThumbs ids={tokensIn} />
        <span className={styles.action}>into the</span>
        <span className={styles.contractLabel}>{POOL_LABEL}</span>
      </div>
    );
  }

  // kind === 'redeem'
  return (
    <div className={styles.header}>
      <ActorName avatar={actorAvatar} address={item.actor} name={displayName} onClick={onClickActor} />
      <span className={styles.action}>redeemed</span>
      <NounThumbs ids={tokensOut} />
      <span className={styles.action}>from the</span>
      <span className={styles.contractLabel}>{POOL_LABEL}</span>
    </div>
  );
}
