/**
 * VoterListView
 * List of delegates with voting power
 * Styled to match the Digest component's voters feed
 */

'use client';

import { useState, useMemo } from 'react';
import { useEnsName, useEnsAvatar } from 'wagmi';
import { mainnet } from 'wagmi/chains';
import { useVoters } from '../hooks';
import type { Voter, VoterSort } from '../types';
import styles from './VoterListView.module.css';

// Treasury addresses to filter from voter list
const TREASURY_ADDRESSES = [
  '0xb1a32fc9f9d8b2cf86c068cae13108809547ef71', // treasury (nouns.eth)
  '0x0bc3807ec262cb779b38d65b38158acc3bfede10', // treasuryV1
];

/**
 * VoterIdentity - Shows ENS avatar and name for a voter
 */
function VoterIdentity({ address }: { address: string }) {
  const { data: ensName } = useEnsName({
    address: address as `0x${string}`,
    chainId: mainnet.id,
  });
  
  const { data: ensAvatar } = useEnsAvatar({
    name: ensName || undefined,
    chainId: mainnet.id,
  });
  
  const displayName = ensName || `${address.slice(0, 6)}...${address.slice(-4)}`;
  
  return (
    <div className={styles.voterIdentity}>
      {ensAvatar ? (
        <img src={ensAvatar} alt="" className={styles.voterAvatar} />
      ) : (
        <div className={styles.voterAvatarPlaceholder} />
      )}
      <span className={styles.voterName}>{displayName}</span>
    </div>
  );
}

interface VoterListViewProps {
  onNavigate: (path: string) => void;
  onBack: () => void;
}

export function VoterListView({ onNavigate, onBack }: VoterListViewProps) {
  const [sort, setSort] = useState<VoterSort>('power');

  const { data: voters, isLoading, error } = useVoters(100, sort);
  
  // Filter out treasury addresses from voters
  const filteredVoters = useMemo(() => {
    if (!voters) return [];
    return voters.filter(v => !TREASURY_ADDRESSES.includes(v.id.toLowerCase()));
  }, [voters]);

  const renderVoterItem = (voter: Voter) => {
    const votes = Number(voter.delegatedVotes);
    
    return (
      <div 
        key={voter.id}
        className={styles.voterItem}
        onClick={() => onNavigate(`voter/${voter.id}`)}
      >
        <div className={styles.voterInfo}>
          <VoterIdentity address={voter.id} />
          <span className={styles.voterVotes}>{votes} vote{votes !== 1 ? 's' : ''}</span>
        </div>
      </div>
    );
  };

  if (error) {
    return (
      <div className={styles.error}>
        <button className={styles.backButton} onClick={onBack}>← Back</button>
        <p>Failed to load voters</p>
        <p className={styles.errorDetail}>{error.message}</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.navBar}>
        <button className={styles.backButton} onClick={onBack}>← Back</button>
      </div>
      <div className={styles.controls}>
        <select
          className={styles.select}
          value={sort}
          onChange={(e) => setSort(e.target.value as VoterSort)}
        >
          <option value="power">Voting Power</option>
          <option value="votes">Votes Cast</option>
          <option value="represented">Delegators</option>
        </select>
      </div>

      <div className={styles.list}>
        {isLoading ? (
          <div className={styles.loading}>Loading voters...</div>
        ) : filteredVoters.length > 0 ? (
          filteredVoters.map(voter => renderVoterItem(voter))
        ) : (
          <div className={styles.empty}>No voters found</div>
        )}
      </div>
    </div>
  );
}
