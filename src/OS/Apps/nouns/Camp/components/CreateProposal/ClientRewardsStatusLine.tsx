/**
 * ClientRewardsStatusLine
 * Pre-form context strip surfaced above admin-rewards-* templates. Surfaces
 * the ClientRewards contract's current on-chain state relevant to whatever
 * the proposer is about to change, including:
 *   - The current value being replaced (so the user sees what they're
 *     changing FROM, not just TO)
 *   - "Already enabled / already this value" warnings for no-op transactions
 *   - For client approve/suspend: the client's name, current approval, and
 *     lifetime rewards numbers from the NFT metadata
 *
 * Mirrors PayerReservesLine / TokenBuyerStatusLine — wired into the modal
 * as a pre-form header rather than building a custom editor for every one
 * of the 10+ rewards admin templates.
 */

'use client';

import { useMemo } from 'react';
import { formatUnits, isAddress } from 'viem';
import type {
  ActionTemplateType,
  TemplateFieldValues,
} from '../../utils/actionTemplates';
import { CLIENT_REWARDS_ADDRESS } from '../../utils/actionTemplates/constants';
import { useClientRewardsState } from '../../hooks/useClientRewardsState';
import { useClientMetadata } from '../../hooks/useClientMetadata';
import styles from './ClientRewardsStatusLine.module.css';

interface ClientRewardsStatusLineProps {
  templateId: ActionTemplateType;
  fieldValues: TemplateFieldValues;
}

function truncate(addr: string | undefined): string {
  if (!addr) return '—';
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function formatEth(amount: bigint | undefined): string {
  if (amount === undefined) return '—';
  const n = parseFloat(formatUnits(amount, 18));
  if (n === 0) return '0 ETH';
  if (n < 0.0001) return `${n.toExponential(2)} ETH`;
  if (n < 1) return `${n.toFixed(6).replace(/0+$/, '').replace(/\.$/, '')} ETH`;
  return `${n.toLocaleString('en-US', { maximumFractionDigits: 4 })} ETH`;
}

export function ClientRewardsStatusLine({
  templateId,
  fieldValues,
}: ClientRewardsStatusLineProps) {
  const state = useClientRewardsState();

  // Parse the incoming clientId field (used by admin-rewards-client-approval)
  const clientIdNum = useMemo(() => {
    const raw = (fieldValues.clientId || '').trim();
    if (!/^\d+$/.test(raw)) return undefined;
    return parseInt(raw, 10);
  }, [fieldValues.clientId]);
  const clientMeta = useClientMetadata(clientIdNum);

  // Helper: detect if a "set X to Y" template's Y matches current X
  const isSameAddress = (current: string | undefined, next: string | undefined) =>
    !!current &&
    !!next &&
    isAddress(next) &&
    current.toLowerCase() === next.toLowerCase();

  // ===== Branching display per template =====
  let body: React.ReactNode = null;

  switch (templateId) {
    case 'admin-rewards-admin': {
      const same = isSameAddress(state.admin, fieldValues.address);
      body = (
        <>
          <Row label="Current admin" value={truncate(state.admin)} mono />
          {same && <Warning text="Already this address — the call will be a no-op" />}
        </>
      );
      break;
    }

    case 'admin-rewards-transfer-ownership': {
      const same = isSameAddress(state.owner, fieldValues.address);
      body = (
        <>
          <Row label="Current owner" value={truncate(state.owner)} mono />
          {same && <Warning text="Already this address — the call will be a no-op" />}
        </>
      );
      break;
    }

    case 'admin-rewards-descriptor': {
      const same = isSameAddress(state.descriptor, fieldValues.address);
      body = (
        <>
          <Row label="Current descriptor" value={truncate(state.descriptor)} mono />
          {same && <Warning text="Already this address — the call will be a no-op" />}
        </>
      );
      break;
    }

    case 'admin-rewards-eth-token': {
      const same = isSameAddress(state.ethToken, fieldValues.address);
      body = (
        <>
          <Row label="Current ETH token" value={truncate(state.ethToken)} mono />
          {same && <Warning text="Already this address — the call will be a no-op" />}
        </>
      );
      break;
    }

    case 'admin-rewards-enable-auction':
    case 'admin-rewards-disable-auction': {
      const current = state.auctionRewardsEnabled;
      const wantEnabled = templateId === 'admin-rewards-enable-auction';
      const noop = current === wantEnabled;
      body = (
        <>
          <Row
            label="Auction rewards"
            value={current === undefined ? 'reading…' : current ? 'enabled' : 'disabled'}
          />
          {noop && (
            <Warning
              text={`Already ${wantEnabled ? 'enabled' : 'disabled'} — the call will be a no-op`}
            />
          )}
        </>
      );
      break;
    }

    case 'admin-rewards-enable-proposal':
    case 'admin-rewards-disable-proposal': {
      const current = state.proposalRewardsEnabled;
      const wantEnabled = templateId === 'admin-rewards-enable-proposal';
      const noop = current === wantEnabled;
      body = (
        <>
          <Row
            label="Proposal rewards"
            value={current === undefined ? 'reading…' : current ? 'enabled' : 'disabled'}
          />
          {noop && (
            <Warning
              text={`Already ${wantEnabled ? 'enabled' : 'disabled'} — the call will be a no-op`}
            />
          )}
        </>
      );
      break;
    }

    case 'admin-rewards-auction-params': {
      const p = state.auctionRewardParams;
      body = p ? (
        <>
          <Row label="Current auction reward" value={`${p.auctionRewardBps} BPS`} />
          <Row
            label="Min auctions between updates"
            value={p.minimumAuctionsBetweenUpdates.toString()}
          />
        </>
      ) : (
        <Row label="Reading current params…" value="" />
      );
      break;
    }

    case 'admin-rewards-proposal-params': {
      const p = state.proposalRewardParams;
      body = p ? (
        <>
          <Row
            label="Current min reward period"
            value={`${p.minimumRewardPeriod}s (${Math.round(p.minimumRewardPeriod / 86400)}d)`}
          />
          <Row
            label="Min proposals for reward"
            value={p.numProposalsEnoughForReward.toString()}
          />
          <Row label="Proposal reward" value={`${p.proposalRewardBps} BPS`} />
          <Row label="Voting reward" value={`${p.votingRewardBps} BPS`} />
          <Row
            label="Eligibility quorum"
            value={`${p.proposalEligibilityQuorumBps} BPS`}
          />
        </>
      ) : (
        <Row label="Reading current params…" value="" />
      );
      break;
    }

    case 'admin-rewards-client-approval': {
      if (clientIdNum === undefined) {
        body = (
          <Row label="Enter a client ID to look up its current state" value="" />
        );
      } else if (clientMeta.isLoading && !clientMeta.exists) {
        body = <Row label={`Client #${clientIdNum}`} value="reading…" />;
      } else if (!clientMeta.exists) {
        body = (
          <>
            <Row
              label={`Client #${clientIdNum}`}
              value={`not yet registered (next mint = #${state.nextTokenId ?? '?'})`}
            />
            <Warning text="No client at this ID — setClientApproval will revert until the client registers" />
          </>
        );
      } else {
        const wantApproved = fieldValues.approved === 'true';
        const noop = clientMeta.approved === wantApproved;
        body = (
          <>
            <Row
              label={`Client #${clientIdNum}${clientMeta.name ? ` · ${clientMeta.name}` : ''}`}
              value={clientMeta.approved ? 'approved' : 'suspended'}
            />
            {clientMeta.rewarded !== undefined && (
              <Row
                label="Lifetime rewarded"
                value={formatEth(clientMeta.rewarded)}
              />
            )}
            {clientMeta.withdrawn !== undefined && (
              <Row
                label="Lifetime withdrawn"
                value={formatEth(clientMeta.withdrawn)}
              />
            )}
            {clientMeta.unwithdrawn !== undefined && clientMeta.unwithdrawn > BigInt(0) && (
              <Row
                label="Currently unclaimed"
                value={formatEth(clientMeta.unwithdrawn)}
              />
            )}
            {fieldValues.approved !== undefined && fieldValues.approved !== '' && noop && (
              <Warning
                text={`Already ${wantApproved ? 'approved' : 'suspended'} — the call will be a no-op`}
              />
            )}
          </>
        );
      }
      break;
    }

    default:
      return null;
  }

  return (
    <div className={styles.statusBanner}>
      <div className={styles.statusHeader}>
        ClientRewards · {truncate(CLIENT_REWARDS_ADDRESS)}
      </div>
      <div className={styles.statusBody}>{body}</div>
    </div>
  );
}

function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className={styles.row}>
      <span className={styles.rowLabel}>{label}</span>
      <span className={mono ? styles.rowValueMono : styles.rowValue}>
        {value}
      </span>
    </div>
  );
}

function Warning({ text }: { text: string }) {
  return <div className={styles.warning}>⚠ {text}</div>;
}
