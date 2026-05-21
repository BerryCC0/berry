/**
 * Propdate activity content.
 * Handles: propdate_posted
 *
 * Renders an on-chain status update posted by a proposal's designated update
 * admin via the Propdates contract. The `isCompleted` flag signals the admin
 * considers the proposal fully delivered — we show a "completed" badge in that
 * case to make it scannable in the feed.
 */

'use client';

import { MarkdownRenderer } from '../MarkdownRenderer';
import { ActorName } from './SharedRenderers';
import type { ActivityContentProps } from './types';
import styles from './ActivityItem.module.css';

export function PropdateContent(props: ActivityContentProps) {
  const { item, displayName, actorAvatar, onClickActor, onClickProposal, onNavigate } = props;
  const isCompleted = item.propdateIsCompleted ?? false;

  return (
    <>
      <div className={styles.header}>
        <ActorName
          avatar={actorAvatar}
          address={item.actor}
          name={displayName}
          onClick={onClickActor}
          onNavigate={onNavigate}
        />
        <span className={styles.action}>
          {isCompleted ? 'marked complete' : 'posted update on'}
        </span>
        <span className={styles.badge} data-type="proposal">
          Proposal {item.proposalId}
        </span>
        {item.proposalTitle && (
          <span
            className={styles.titleLink}
            onClick={onClickProposal}
            role="button"
            tabIndex={0}
          >
            {item.proposalTitle}
          </span>
        )}
        {isCompleted && (
          <span className={styles.badge} data-type="executed">
            Completed
          </span>
        )}
      </div>
      {item.propdateUpdate && (
        <MarkdownRenderer content={item.propdateUpdate} className={styles.reason} />
      )}
    </>
  );
}
