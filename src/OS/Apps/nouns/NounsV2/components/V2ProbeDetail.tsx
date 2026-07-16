/**
 * V2 Probe detail — full-page view of a single V2 noun: large on-chain art,
 * clickable traits (filter the grid), owner / winner / settler, and full bid
 * history. Reuses useV2AuctionDetail + V2BidHistory from the Auction tab.
 */

'use client';

import { useMemo } from 'react';
import { useEnsDataBatch, getEnsFromMap } from '@/OS/hooks/useEnsData';
import { V2NounImage } from './V2NounImage';
import { V2BidHistory } from './V2BidHistory';
import { useV2AuctionDetail } from '../hooks/useV2AuctionHistory';
import { getV2TraitLabel, type V2TraitType } from '../utils/traitLabels';
import { fmtEth, truncateAddr } from '../utils/format';
import { v2AddressLink } from '../contracts';
import styles from './V2ProbeDetail.module.css';

interface Props {
  nounId: number;
  onBack: () => void;
  onGoBack: () => void;
  onGoForward: () => void;
  canGoBack: boolean;
  canGoForward: boolean;
  onFilterByTrait: (type: V2TraitType, value: number) => void;
}

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
// V2 inherited V1's two backgrounds at fork: 0 = Cool, 1 = Warm.
const V2_BG_HEX = ['#d5d7e1', '#e1d7d5'];

const isAddr = (a?: string | null): a is string => !!a && a !== ZERO_ADDRESS;

export function V2ProbeDetail({
  nounId,
  onBack,
  onGoBack,
  onGoForward,
  canGoBack,
  canGoForward,
  onFilterByTrait,
}: Props) {
  const { data, isLoading } = useV2AuctionDetail(nounId);
  const auction = data?.auction ?? null;
  const noun = data?.noun ?? null;
  const bids = data?.bids ?? [];

  const addresses = useMemo(
    () => [noun?.owner, auction?.winner, auction?.settlerAddress].filter(isAddr) as string[],
    [noun, auction]
  );
  const { data: ensMap } = useEnsDataBatch(addresses);
  const nameFor = (addr?: string | null) =>
    isAddr(addr) ? (getEnsFromMap(ensMap, addr).name ?? truncateAddr(addr)) : null;

  const traits: { type: V2TraitType; value: number }[] = noun
    ? [
        { type: 'head', value: noun.head },
        { type: 'glasses', value: noun.glasses },
        { type: 'accessory', value: noun.accessory },
        { type: 'body', value: noun.body },
        { type: 'background', value: noun.background },
      ]
    : [];

  const bgColor = noun ? V2_BG_HEX[noun.background] : undefined;
  const winningBidWei = auction?.amount != null ? BigInt(auction.amount) : null;

  return (
    <div className={styles.container}>
      <div className={styles.topBar}>
        <div className={styles.breadcrumb}>
          <button type="button" className={styles.crumbLink} onClick={onBack}>
            NOUNS
          </button>
          <span className={styles.crumbSep}>/</span>
          <span className={styles.crumbCurrent}>{nounId}</span>
        </div>
        <div className={styles.navButtons}>
          <button
            type="button"
            className={styles.navButton}
            onClick={onGoBack}
            disabled={!canGoBack}
            title="Go back"
          >
            ←
          </button>
          <button
            type="button"
            className={styles.navButton}
            onClick={onGoForward}
            disabled={!canGoForward}
            title="Go forward"
          >
            →
          </button>
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.infoSection}>
          <h1 className={styles.title}>
            NOUN V2 {nounId}
            {noun?.isSlobber && <span className={styles.slobberBadge}>SLOBBER</span>}
            {noun?.burned && <span className={styles.burnedBadge}>BURNED</span>}
          </h1>

          <div className={styles.infoBlock}>
            {isAddr(auction?.settlerAddress) && (
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>SETTLED BY: </span>
                <a
                  href={v2AddressLink(auction!.settlerAddress!)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.infoLink}
                >
                  {nameFor(auction!.settlerAddress)}
                </a>
              </div>
            )}
            {winningBidWei != null && winningBidWei > BigInt(0) && (
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>WINNING BID: </span>
                <span className={styles.infoValue}>Ξ {fmtEth(winningBidWei)}</span>
                {isAddr(auction?.winner) && (
                  <>
                    <span className={styles.infoSecondary}> BY </span>
                    <a
                      href={v2AddressLink(auction!.winner!)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.infoLink}
                    >
                      {nameFor(auction!.winner)}
                    </a>
                  </>
                )}
              </div>
            )}
            {isAddr(noun?.owner) && (
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>OWNER: </span>
                <a
                  href={v2AddressLink(noun!.owner!)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.infoLink}
                >
                  {nameFor(noun!.owner)}
                </a>
              </div>
            )}
          </div>

          {noun && (
            <div className={styles.traitsSection}>
              <div className={styles.traitsTitle}>ABOUT</div>
              {traits.map((trait) => (
                <div key={trait.type} className={styles.traitRow}>
                  <span className={styles.traitLabel}>{trait.type.toUpperCase()}:</span>
                  <button
                    type="button"
                    className={styles.traitLink}
                    onClick={() => onFilterByTrait(trait.type, trait.value)}
                    title={`Filter by ${trait.type}`}
                  >
                    {getV2TraitLabel(trait.type, trait.value).toUpperCase()}
                  </button>
                </div>
              ))}
            </div>
          )}

          <V2BidHistory bids={bids} loading={isLoading} />
        </div>

        <div className={styles.imageSection} style={bgColor ? { background: bgColor } : undefined}>
          <V2NounImage tokenId={BigInt(nounId)} size={420} className={styles.nounImage} />
        </div>
      </div>
    </div>
  );
}
