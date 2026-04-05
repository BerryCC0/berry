/**
 * Proposal lifecycle activity content.
 * Handles: proposal_created, proposal_voting_started, proposal_succeeded,
 *          proposal_defeated, proposal_cancelled, proposal_queued,
 *          proposal_executed, proposal_updated
 */

'use client';

import { getClientName } from '@/OS/lib/clientNames';
import { MarkdownRenderer } from '../MarkdownRenderer';
import { ActorName } from './SharedRenderers';
import type { ActivityContentProps } from './types';
import styles from './ActivityItem.module.css';

export function ProposalLifecycleContent(props: ActivityContentProps) {
  const { item, displayName, actorAvatar, onClickActor, onClickProposal } = props;

  switch (item.type) {
    case 'proposal_created':
      return (
        <div className={styles.header}>
          <ActorName avatar={actorAvatar} name={displayName} onClick={onClickActor} />
          <span className={styles.action}>created</span>
          <span className={styles.badge} data-type="proposal">Proposal</span>
          {item.proposalTitle && (
            <span className={styles.titleLink} onClick={onClickProposal} role="button" tabIndex={0}>
              {item.proposalTitle}
            </span>
          )}
          {item.clientId != null && item.clientId !== 0 && (
            <span className={styles.clientBadge}>via {getClientName(item.clientId)}</span>
          )}
        </div>
      );

    case 'proposal_voting_started':
      return (
        <div className={styles.header}>
          <span className={styles.action}>Voting for</span>
          <span className={styles.badge} data-type="proposal">Proposal {item.proposalId}</span>
          {item.proposalTitle && (
            <span className={styles.titleLink} onClick={onClickProposal} role="button" tabIndex={0}>
              {item.proposalTitle}
            </span>
          )}
          <span className={styles.action}>started</span>
        </div>
      );

    case 'proposal_succeeded':
      return (
        <div className={styles.header}>
          <span className={styles.badge} data-type="succeeded">Proposal {item.proposalId}</span>
          {item.proposalTitle && (
            <span className={styles.titleLink} onClick={onClickProposal} role="button" tabIndex={0}>
              {item.proposalTitle}
            </span>
          )}
          <span className={styles.action}>succeeded</span>
        </div>
      );

    case 'proposal_defeated':
      return (
        <div className={styles.header}>
          <span className={styles.badge} data-type="defeated">Proposal {item.proposalId}</span>
          {item.proposalTitle && (
            <span className={styles.titleLink} onClick={onClickProposal} role="button" tabIndex={0}>
              {item.proposalTitle}
            </span>
          )}
          <span className={styles.action}>was defeated</span>
        </div>
      );

    case 'proposal_cancelled':
      return (
        <div className={styles.header}>
          <span className={styles.badge} data-type="cancelled">Proposal {item.proposalId}</span>
          {item.proposalTitle && (
            <span className={styles.titleLink} onClick={onClickProposal} role="button" tabIndex={0}>
              {item.proposalTitle}
            </span>
          )}
          <span className={styles.action}>was cancelled</span>
        </div>
      );

    case 'proposal_queued':
      return (
        <div className={styles.header}>
          <span className={styles.badge} data-type="queued">Proposal {item.proposalId}</span>
          {item.proposalTitle && (
            <span className={styles.titleLink} onClick={onClickProposal} role="button" tabIndex={0}>
              {item.proposalTitle}
            </span>
          )}
          <span className={styles.action}>was queued for execution</span>
        </div>
      );

    case 'proposal_executed':
      return (
        <div className={styles.header}>
          <span className={styles.badge} data-type="executed">Proposal {item.proposalId}</span>
          {item.proposalTitle && (
            <span className={styles.titleLink} onClick={onClickProposal} role="button" tabIndex={0}>
              {item.proposalTitle}
            </span>
          )}
          <span className={styles.action}>was executed</span>
        </div>
      );

    case 'proposal_updated':
      return (
        <>
          <div className={styles.header}>
            <ActorName avatar={actorAvatar} name={displayName} onClick={onClickActor} />
            <span className={styles.action}>updated</span>
            <span className={styles.badge} data-type="proposal">Proposal</span>
            {item.proposalTitle && (
              <span className={styles.titleLink} onClick={onClickProposal} role="button" tabIndex={0}>
                {item.proposalTitle}
              </span>
            )}
          </div>
          {item.updateMessage && (
            <MarkdownRenderer content={item.updateMessage} className={styles.reason} />
          )}
        </>
      );

    default:
      return null;
  }
}
