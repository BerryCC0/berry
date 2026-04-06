/**
 * Candidate activity content.
 * Handles: candidate_created, candidate_feedback, candidate_sponsored, candidate_updated
 */

'use client';

import { getSupportLabel, getSupportColor } from '../../types';
import { formatSlugToTitle } from '../../utils/formatUtils';
import { MarkdownRenderer } from '../MarkdownRenderer';
import { ActorName, ReasonContent } from './SharedRenderers';
import type { ActivityContentProps } from './types';
import styles from './ActivityItem.module.css';

export function CandidateContent(props: ActivityContentProps) {
  const { item, displayName, actorAvatar, repostInfo, onClickActor, onClickCandidate } = props;
  const candidateTitle = item.candidateTitle || (item.candidateSlug ? formatSlugToTitle(item.candidateSlug) : undefined);

  switch (item.type) {
    case 'candidate_created':
      return (
        <div className={styles.header}>
          <ActorName avatar={actorAvatar} address={item.actor} name={displayName} onClick={onClickActor} />
          <span className={styles.action}>created</span>
          <span className={styles.badge} data-type="candidate">Candidate</span>
          {candidateTitle && (
            <span className={styles.titleLink} onClick={onClickCandidate} role="button" tabIndex={0}>
              {candidateTitle}
            </span>
          )}
        </div>
      );

    case 'candidate_feedback':
      return (
        <>
          <div className={styles.header}>
            <ActorName avatar={actorAvatar} address={item.actor} name={displayName} onClick={onClickActor} />
            {repostInfo ? (
              <>
                <span className={styles.action}>reposted a</span>
                {item.support !== undefined && (
                  <span className={styles.support} style={{ color: getSupportColor(item.support) }}>
                    {getSupportLabel(item.support)}
                  </span>
                )}
                <span className={styles.action}>signal</span>
              </>
            ) : (
              <>
                <span className={styles.action}>signaled</span>
                {item.support !== undefined && (
                  <span className={styles.support} style={{ color: getSupportColor(item.support) }}>
                    {getSupportLabel(item.support)}
                  </span>
                )}
              </>
            )}
          </div>
          {candidateTitle && (
            <div className={styles.proposal} onClick={onClickCandidate} role="button" tabIndex={0}>
              {candidateTitle}
            </div>
          )}
          <ReasonContent {...props} />
        </>
      );

    case 'candidate_sponsored':
      return (
        <>
          <div className={styles.header}>
            <ActorName avatar={actorAvatar} address={item.actor} name={displayName} onClick={onClickActor} />
            <span className={styles.action}>sponsored</span>
            {candidateTitle && (
              <span className={styles.titleLink} onClick={onClickCandidate} role="button" tabIndex={0}>
                {candidateTitle}
              </span>
            )}
          </div>
          {item.reason && (
            <MarkdownRenderer content={item.reason} className={styles.reason} />
          )}
        </>
      );

    case 'candidate_updated':
      return (
        <>
          <div className={styles.header}>
            <ActorName avatar={actorAvatar} address={item.actor} name={displayName} onClick={onClickActor} />
            <span className={styles.action}>updated</span>
            <span className={styles.badge} data-type="candidate">Candidate</span>
            {item.candidateSlug && (
              <span className={styles.titleLink} onClick={onClickCandidate} role="button" tabIndex={0}>
                {item.candidateTitle || formatSlugToTitle(item.candidateSlug)}
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
