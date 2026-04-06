/**
 * Vote & Proposal Feedback activity content.
 * Handles: vote, proposal_feedback
 */

'use client';

import { getSupportLabel, getSupportColor } from '../../types';
import { getClientName } from '@/OS/lib/clientNames';
import { ActorName, ReasonContent } from './SharedRenderers';
import type { ActivityContentProps } from './types';
import styles from './ActivityItem.module.css';

export function VoteContent(props: ActivityContentProps) {
  const { item, displayName, actorAvatar, repostInfo, onClickActor, onClickProposal } = props;
  const isVote = item.type === 'vote';
  const actionWord = isVote ? 'voted' : 'signaled';
  const repostNoun = isVote ? 'vote' : 'signal';

  return (
    <>
      <div className={styles.header}>
        <ActorName avatar={actorAvatar} address={item.actor} name={displayName} onClick={onClickActor} />
        {isVote && item.votes && item.support !== undefined && (
          <span className={styles.support} style={{ color: getSupportColor(item.support) }}>
            {item.votes} {item.votes === '1' ? 'vote' : 'votes'}
          </span>
        )}
        {repostInfo ? (
          <>
            <span className={styles.action}>reposted a</span>
            {item.support !== undefined && (
              <span className={styles.support} style={{ color: getSupportColor(item.support) }}>
                {getSupportLabel(item.support)}
              </span>
            )}
            <span className={styles.action}>{repostNoun}</span>
          </>
        ) : item.support !== undefined ? (
          <span className={styles.support} style={{ color: getSupportColor(item.support) }}>
            {actionWord} {getSupportLabel(item.support)}
          </span>
        ) : (
          <span className={styles.action}>{actionWord}</span>
        )}
        {item.clientId != null && item.clientId !== 0 && (
          <span className={styles.clientBadge}>via {getClientName(item.clientId)}</span>
        )}
      </div>
      {item.proposalTitle && (
        <div className={styles.proposal} onClick={onClickProposal} role="button" tabIndex={0}>
          Prop {item.proposalId}: {item.proposalTitle}
        </div>
      )}
      <ReasonContent {...props} />
    </>
  );
}
