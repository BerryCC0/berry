/**
 * CandidateDetailView
 * Full candidate detail view
 */

'use client';

import { useEnsName } from 'wagmi';
import { mainnet } from 'wagmi/chains';
import { useCandidate } from '../hooks/useCandidates';
import { ShareButton } from '../components/ShareButton';
import { MarkdownRenderer } from '../components/MarkdownRenderer';
import styles from './CandidateDetailView.module.css';

interface CandidateDetailViewProps {
  proposer: string;
  slug: string;
  onNavigate: (path: string) => void;
  onBack: () => void;
}

export function CandidateDetailView({ proposer, slug, onNavigate, onBack }: CandidateDetailViewProps) {
  const { data: candidate, isLoading, error } = useCandidate(proposer, slug);
  const { data: ensName } = useEnsName({
    address: proposer as `0x${string}`,
    chainId: mainnet.id,
  });

  const proposerDisplay = ensName || `${proposer.slice(0, 6)}...${proposer.slice(-4)}`;

  if (error) {
    return (
      <div className={styles.error}>
        <button className={styles.backButton} onClick={onBack}>← Back</button>
        <p>Failed to load candidate</p>
      </div>
    );
  }

  if (isLoading || !candidate) {
    return (
      <div className={styles.loading}>
        <button className={styles.backButton} onClick={onBack}>← Back</button>
        <p>Loading candidate...</p>
      </div>
    );
  }

  const title = candidate.title || candidate.slug.replace(/-/g, ' ');
  const createdDate = new Date(Number(candidate.createdTimestamp) * 1000);

  return (
    <div className={styles.container}>
      <div className={styles.navBar}>
        <button className={styles.backButton} onClick={onBack}>← Back</button>
        <ShareButton path={`candidate/${proposer}/${slug}`} />
      </div>

      <div className={styles.header}>
        <span className={styles.label}>Candidate</span>
        <span className={styles.slug}>/{candidate.slug}</span>
      </div>

      <h1 className={styles.title}>{title}</h1>

      <div className={styles.meta}>
        <div className={styles.metaItem}>
          <span className={styles.metaLabel}>Proposer</span>
          <span 
            className={styles.metaValue}
            onClick={() => onNavigate(`voter/${proposer}`)}
            style={{ cursor: 'pointer' }}
          >
            {proposerDisplay}
          </span>
        </div>
        <div className={styles.metaItem}>
          <span className={styles.metaLabel}>Created</span>
          <span className={styles.metaValue}>
            {createdDate.toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric', 
              year: 'numeric' 
            })}
          </span>
        </div>
      </div>

      {/* Description */}
      <div className={styles.description}>
        <h2 className={styles.sectionTitle}>Description</h2>
        <MarkdownRenderer 
          content={candidate.description} 
          className={styles.descriptionContent}
        />
      </div>
    </div>
  );
}

