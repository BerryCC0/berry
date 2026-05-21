/**
 * Candidate activity content.
 * Handles: candidate_created, candidate_feedback, candidate_sponsored,
 *          candidate_updated, signature_canceled
 *
 * `signature_canceled` is folded in here because cancellations are predominantly
 * candidate-sponsorship revocations. When the on-chain event can't be matched
 * back to a candidate row (signatureKind === 'proposal'), we render a generic
 * "X canceled a proposal signature" line.
 */

'use client';

import { getSupportLabel, getSupportColor } from '../../types';
import { formatSlugToTitle, formatRelativeTimeCompact } from '../../utils/formatUtils';
import { MarkdownRenderer } from '../MarkdownRenderer';
import { ActorName, ReasonContent } from './SharedRenderers';
import type { ActivityContentProps } from './types';
import styles from './ActivityItem.module.css';

/**
 * Derive "Expires in 3d" / "Expired" text + a boolean for the [data-expired]
 * attribute. Returns null when the item has no expirationTimestamp so the
 * badge can be omitted entirely.
 */
function expirationBadge(expirationTimestamp: string | undefined) {
  if (!expirationTimestamp) return null;
  const expSec = Number(expirationTimestamp);
  if (!Number.isFinite(expSec) || expSec <= 0) return null;
  const now = Math.floor(Date.now() / 1000);
  const expired = expSec <= now;
  return {
    text: expired ? 'Expired' : formatRelativeTimeCompact(expSec, 'Expires in'),
    expired,
  };
}

export function CandidateContent(props: ActivityContentProps) {
  const { item, displayName, actorAvatar, repostInfo, onClickActor, onClickCandidate, onNavigate } = props;
  const candidateTitle = item.candidateTitle || (item.candidateSlug ? formatSlugToTitle(item.candidateSlug) : undefined);

  switch (item.type) {
    case 'candidate_created':
      return (
        <div className={styles.header}>
          <ActorName avatar={actorAvatar} address={item.actor} name={displayName} onClick={onClickActor} onNavigate={onNavigate} />
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
            <ActorName avatar={actorAvatar} address={item.actor} name={displayName} onClick={onClickActor} onNavigate={onNavigate} />
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

    case 'candidate_sponsored': {
      const exp = expirationBadge(item.expirationTimestamp);
      return (
        <>
          <div className={styles.header}>
            <ActorName avatar={actorAvatar} address={item.actor} name={displayName} onClick={onClickActor} onNavigate={onNavigate} />
            <span className={styles.action}>sponsored</span>
            {candidateTitle && (
              <span className={styles.titleLink} onClick={onClickCandidate} role="button" tabIndex={0}>
                {candidateTitle}
              </span>
            )}
            {exp && (
              <span className={styles.expiresBadge} data-expired={exp.expired ? 'true' : 'false'}>
                {exp.text}
              </span>
            )}
          </div>
          {item.reason && (
            <MarkdownRenderer content={item.reason} className={styles.reason} />
          )}
        </>
      );
    }

    case 'signature_canceled': {
      // signatureKind === 'candidate' AND we have title → specific message.
      // Otherwise fall back to the generic proposal-sig wording.
      const isCandidate = item.signatureKind === 'candidate' && candidateTitle;
      return (
        <div className={styles.header}>
          <ActorName avatar={actorAvatar} address={item.actor} name={displayName} onClick={onClickActor} onNavigate={onNavigate} />
          <span className={styles.action}>
            {isCandidate ? 'canceled their sponsorship of' : 'canceled a proposal signature'}
          </span>
          {isCandidate && (
            <span className={styles.titleLink} onClick={onClickCandidate} role="button" tabIndex={0}>
              {candidateTitle}
            </span>
          )}
        </div>
      );
    }

    case 'candidate_updated':
      return (
        <>
          <div className={styles.header}>
            <ActorName avatar={actorAvatar} address={item.actor} name={displayName} onClick={onClickActor} onNavigate={onNavigate} />
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
