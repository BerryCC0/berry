/**
 * Noun transfer & delegation activity content.
 * Handles: noun_transfer, noun_delegation
 */

'use client';

import { formatEther } from 'viem';
import { NounImageById } from '@/app/lib/nouns/components';
import { ActorName } from './SharedRenderers';
import type { ActivityContentProps } from './types';
import styles from './ActivityItem.module.css';

export function TransferContent(props: ActivityContentProps) {
  const {
    item,
    displayName,
    actorAvatar,
    toAddressEns,
    nounId,
    fromContractLabel,
    toContractLabel,
    isFromContract,
    isToContract,
    isSale,
    salePrice,
    formatAddr,
    onClickActor,
    onClickToAddress,
  } = props;

  if (item.type === 'noun_delegation') {
    return <DelegationContent {...props} />;
  }

  const effectiveSalePrice = salePrice || item.salePrice;

  // Bulk transfer: multiple nouns in one transaction
  if (item.isBulkTransfer && item.nounIds && item.fromAddresses) {
    const nounCount = item.nounIds.length;
    const sellerList = item.fromAddresses.map((addr) => formatAddr(addr, null));
    const sellersDisplay =
      sellerList.length <= 2 ? sellerList.join(' and ') : `${sellerList.length} sellers`;

    if (isSale && effectiveSalePrice) {
      const priceInEth = Number(formatEther(BigInt(effectiveSalePrice))).toFixed(2);
      return (
        <div className={styles.header}>
          <ActorName avatar={actorAvatar} name={displayName} onClick={onClickActor} />
          <span className={styles.action}>bought</span>
          <span className={styles.action}>{nounCount} nouns</span>
          {item.nounIds.map((id) => (
            <NounImageById key={id} id={parseInt(id, 10)} size={22} className={styles.nounImageInline} />
          ))}
          <span className={styles.action}>from</span>
          <span className={styles.action}>{sellersDisplay}</span>
          <span className={styles.action}>for</span>
          <span className={styles.salePrice}>{priceInEth} ETH</span>
        </div>
      );
    }

    return (
      <div className={styles.header}>
        <ActorName avatar={actorAvatar} name={displayName} onClick={onClickActor} />
        <span className={styles.action}>received</span>
        <span className={styles.action}>{nounCount} nouns</span>
        {item.nounIds.map((id) => (
          <NounImageById key={id} id={parseInt(id, 10)} size={22} className={styles.nounImageInline} />
        ))}
        <span className={styles.action}>from</span>
        <span className={styles.action}>{sellersDisplay}</span>
      </div>
    );
  }

  // Single transfer sale
  if (isSale && effectiveSalePrice) {
    const priceInEth = Number(formatEther(BigInt(effectiveSalePrice))).toFixed(3);
    return (
      <div className={styles.header}>
        <ActorName avatar={actorAvatar} name={displayName} onClick={onClickActor} />
        <span className={styles.action}>sold</span>
        {nounId !== undefined && (
          <NounImageById id={nounId} size={22} className={styles.nounImageInline} />
        )}
        <span className={styles.nounBadge}>
          Noun <strong>{item.nounId}</strong>
        </span>
        <span className={styles.action}>for</span>
        <span className={styles.salePrice}>{priceInEth} ETH</span>
        <span className={styles.action}>to</span>
        <span className={styles.actor} onClick={onClickToAddress} role="button" tabIndex={0}>
          {item.toAddress && formatAddr(item.toAddress, toAddressEns)}
        </span>
      </div>
    );
  }

  // Withdrew from contract
  if (isFromContract && !isToContract) {
    return (
      <div className={styles.header}>
        <ActorName avatar={actorAvatar} name={displayName} onClick={onClickActor} />
        <span className={styles.action}>withdrew</span>
        {nounId !== undefined && (
          <NounImageById id={nounId} size={22} className={styles.nounImageInline} />
        )}
        <span className={styles.nounBadge}>
          Noun <strong>{item.nounId}</strong>
        </span>
        <span className={styles.action}>from</span>
        <span className={styles.contractLabel}>{fromContractLabel}</span>
      </div>
    );
  }

  // Deposited to contract
  if (!isFromContract && isToContract) {
    return (
      <div className={styles.header}>
        <ActorName avatar={actorAvatar} name={displayName} onClick={onClickActor} />
        <span className={styles.action}>deposited</span>
        {nounId !== undefined && (
          <NounImageById id={nounId} size={22} className={styles.nounImageInline} />
        )}
        <span className={styles.nounBadge}>
          Noun <strong>{item.nounId}</strong>
        </span>
        <span className={styles.action}>to</span>
        <span className={styles.contractLabel}>{toContractLabel}</span>
      </div>
    );
  }

  // Regular transfer (EOA to EOA, or contract to contract)
  return (
    <div className={styles.header}>
      <span className={styles.actor} onClick={onClickActor} role="button" tabIndex={0}>
        {displayName}
      </span>
      <span className={styles.action}>transferred</span>
      {nounId !== undefined && (
        <NounImageById id={nounId} size={22} className={styles.nounImageInline} />
      )}
      <span className={styles.nounBadge}>
        Noun <strong>{item.nounId}</strong>
      </span>
      <span className={styles.action}>to</span>
      <span className={styles.actor} onClick={onClickToAddress} role="button" tabIndex={0}>
        {item.toAddress && formatAddr(item.toAddress, toAddressEns)}
      </span>
    </div>
  );
}

// -----------------------------------------------------------------------
// Delegation sub-component
// -----------------------------------------------------------------------

function DelegationContent({
  item,
  displayName,
  actorAvatar,
  toAddressEns,
  nounId,
  formatAddr,
  onClickActor,
  onClickToAddress,
}: ActivityContentProps) {
  // Multiple nouns delegated
  if (item.nounIds && item.nounIds.length > 0) {
    return (
      <div className={styles.header}>
        <ActorName avatar={actorAvatar} name={displayName} onClick={onClickActor} />
        <span className={styles.action}>delegated</span>
        {item.nounIds.map((id) => (
          <NounImageById key={id} id={parseInt(id, 10)} size={22} className={styles.nounImageInline} />
        ))}
        <span className={styles.action}>
          {item.nounIds.length} {item.nounIds.length === 1 ? 'noun' : 'nouns'}
        </span>
        <span className={styles.action}>to</span>
        <span className={styles.actor} onClick={onClickToAddress} role="button" tabIndex={0}>
          {item.toAddress && formatAddr(item.toAddress, toAddressEns)}
        </span>
      </div>
    );
  }

  // Single noun delegated
  return (
    <div className={styles.header}>
      <ActorName avatar={actorAvatar} name={displayName} onClick={onClickActor} />
      <span className={styles.action}>delegated</span>
      {nounId !== undefined && (
        <NounImageById id={nounId} size={22} className={styles.nounImageInline} />
      )}
      {item.nounId ? (
        <span className={styles.nounBadge}>
          Noun <strong>{item.nounId}</strong>
        </span>
      ) : (
        <span className={styles.action}>votes</span>
      )}
      <span className={styles.action}>to</span>
      <span className={styles.actor} onClick={onClickToAddress} role="button" tabIndex={0}>
        {item.toAddress && formatAddr(item.toAddress, toAddressEns)}
      </span>
    </div>
  );
}
