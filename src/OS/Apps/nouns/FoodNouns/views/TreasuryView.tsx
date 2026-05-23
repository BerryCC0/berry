/**
 * Treasury overview — built on the Ponder-indexed treasury data.
 *
 * Sections (top to bottom, single scrollable view):
 *   1. Hero card  : live ETH balance (wagmi)
 *   2. Stat row   : all-time inflows / spent / net / Nouns held
 *   3. 30-day card: textual summary of the last-30-days window
 *   4. Pending    : timelock queue with ETA countdown (hidden when empty)
 *   5. Activity   : unified chronological feed of inflows + execs + cancels
 *   6. Meta       : address, admin, delay, lifetime counts
 *   7. Nouns held : grid of any Nouns owned by the treasury (hidden when empty)
 *
 * Each timelock action in pending/activity is pre-decoded server-side by
 * decodeTreasuryTx, so this component just walks DecodedTreasuryTx and renders.
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import { useReadContract } from 'wagmi';
import { useEnsData } from '@/OS/hooks/useEnsData';
import { addressToAvatar } from '@/OS/Apps/nouns/Camp/utils/addressAvatar';
import { formatAddress } from '@/shared/format';
import {
  fnAddressLink,
  fnTxLink,
  FN_ADDRESSES,
  FN_AUCTION_SPLIT,
  FN_CHAIN_ID,
} from '../contracts';
import { useFNTreasuryBalance } from '../hooks/useFNTreasury';
import {
  useFNTreasuryActivity,
  type DecodedInput,
  type DecodedTreasuryTx,
  type FNTreasuryFeedItem,
  type FNTreasuryPendingItem,
} from '../hooks/useFNTreasuryActivity';
import { fmtEth, truncateAddr } from '../utils/format';
import styles from './TreasuryView.module.css';

const treasuryReadAbi = [
  {
    inputs: [],
    name: 'admin',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'delay',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

/**
 * Friendly labels for known contracts and wallets — surfaced on every target
 * render. Includes the four auction-split recipients so the breakdown card
 * shows names rather than truncated hex.
 */
const KNOWN_FN_LABELS: Record<string, string> = {
  [FN_ADDRESSES.token.toLowerCase()]: 'FN Token',
  [FN_ADDRESSES.auctionHouse.toLowerCase()]: 'FN Auction House',
  [FN_ADDRESSES.governor.toLowerCase()]: 'FN Governor',
  [FN_ADDRESSES.treasury.toLowerCase()]: 'FN Treasury (self)',
  [FN_ADDRESSES.descriptor.toLowerCase()]: 'FN Descriptor',
  ...Object.fromEntries(
    FN_AUCTION_SPLIT.map((s) => [s.address.toLowerCase(), s.label]),
  ),
};

/**
 * Map a split-recipient address to a CSS class for the colored bar segment
 * and matching swatch. Order matches FN_AUCTION_SPLIT (treasury → DAO → nouncil
 * → founders) and the colors reflect a "this DAO vs. allies" hierarchy.
 */
function splitSegClass(address: string): string {
  const lc = address.toLowerCase();
  const idx = FN_AUCTION_SPLIT.findIndex(
    (s) => s.address.toLowerCase() === lc,
  );
  return styles[`splitSeg${idx}` as keyof typeof styles] ?? '';
}

// =============================================================================

export function TreasuryView() {
  const { wei: balanceWei, isLoading: balanceLoading } = useFNTreasuryBalance();
  const { data: activity, isLoading: activityLoading, error } = useFNTreasuryActivity();

  const { data: adminAddr } = useReadContract({
    address: FN_ADDRESSES.treasury,
    abi: treasuryReadAbi,
    functionName: 'admin',
    chainId: FN_CHAIN_ID,
  });

  const { data: delaySec } = useReadContract({
    address: FN_ADDRESSES.treasury,
    abi: treasuryReadAbi,
    functionName: 'delay',
    chainId: FN_CHAIN_ID,
  });

  const delayHours = delaySec != null ? Number(delaySec) / 3600 : null;

  return (
    <div className={styles.view}>
      {/* 1. Hero: live balance */}
      <div className={styles.heroCard}>
        <div className={styles.heroLabel}>Treasury balance</div>
        <div className={styles.heroValue}>
          {balanceLoading ? '…' : `Ξ ${fmtEth(balanceWei)}`}
        </div>
        <div className={styles.heroSub}>
          Held by the Food Nouns DAO Executor (timelock).
        </div>
      </div>

      {/* 2. Stat row */}
      <div className={styles.statRow}>
        <StatCard
          label="Received by treasury"
          value={
            activity && !balanceLoading
              ? `Ξ ${fmtEth(
                  (BigInt(balanceWei) +
                    BigInt(activity.totals.outflowsExecutedWei)).toString(),
                )}`
              : '…'
          }
          sub={
            activity
              ? `${activity.totals.inflowCount} auctions · 50% share`
              : undefined
          }
        />
        <StatCard
          label="Spent (executed)"
          value={activity ? `Ξ ${fmtEth(activity.totals.outflowsExecutedWei)}` : '…'}
          sub={
            activity
              ? `${activity.totals.executedCount} transaction${activity.totals.executedCount !== 1 ? 's' : ''}`
              : undefined
          }
        />
        <StatCard
          label="Auction proceeds (gross)"
          value={
            activity
              ? `Ξ ${fmtEth(activity.totals.grossAuctionProceedsWei)}`
              : '…'
          }
          sub="Across all settled auctions"
        />
        <StatCard
          label="Nouns held"
          value={activity ? String(activity.treasuryNouns.length) : '…'}
        />
      </div>

      {/* 2b. Auction proceeds split — categorical breakdown */}
      {activity && BigInt(activity.totals.grossAuctionProceedsWei) > BigInt(0) && (
        <section className={styles.splitCard}>
          <div className={styles.splitHeader}>
            <span className={styles.splitTitle}>Where every auction&apos;s Ξ goes</span>
            <span className={styles.splitSubtitle}>
              Hardcoded in the auction-house contract — every settled bid is
              split four ways
            </span>
          </div>
          <div className={styles.splitBar}>
            {activity.splits.map((s) => (
              <span
                key={s.address}
                className={`${styles.splitBarSeg} ${splitSegClass(s.address)}`}
                style={{ width: `${s.percent}%` }}
                title={`${s.label} — ${s.percent}%`}
              />
            ))}
          </div>
          <div className={styles.splitList}>
            {activity.splits.map((s) => (
              <div key={s.address} className={styles.splitRow}>
                <span
                  className={`${styles.splitSwatch} ${splitSegClass(s.address)}`}
                />
                <div className={styles.splitRowMain}>
                  <div className={styles.splitRowTitle}>
                    <span className={styles.splitPercent}>{s.percent}%</span>
                    {' → '}
                    <AddressLink address={s.address} />
                  </div>
                  <div className={styles.splitRowSub}>{s.sub}</div>
                </div>
                <div className={styles.splitRowAmount}>
                  Ξ {fmtEth(s.allocatedWei)}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 3. 30-day text summary */}
      {activity && (
        <div className={styles.windowCard}>
          <span className={styles.windowLabel}>Last 30 days</span>
          <span className={styles.windowFlow}>
            <span className={styles.flowIn}>
              +Ξ {fmtEth(activity.last30d.treasuryShareWei)} in
            </span>
            <span className={styles.flowSep}>·</span>
            <span className={styles.flowOut}>
              −Ξ {fmtEth(activity.last30d.outflowsWei)} out
            </span>
            <span className={styles.flowSep}>·</span>
            <span className={styles.flowNet}>
              Net Ξ {fmtEth(activity.last30d.netWei)}
            </span>
          </span>
        </div>
      )}

      {/* 4. Pending queue */}
      {activity && activity.pending.length > 0 && (
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>
            Pending in timelock ({activity.pending.length})
          </h3>
          <div className={styles.pendingList}>
            {activity.pending.map((p) => (
              <PendingRow key={p.id} item={p} />
            ))}
          </div>
        </section>
      )}

      {/* 5. Recent activity */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Recent activity</h3>
        {activityLoading && !activity ? (
          <div className={styles.feedEmpty}>Loading…</div>
        ) : error ? (
          <div className={styles.feedEmpty}>
            Couldn&apos;t load activity{error instanceof Error ? `: ${error.message}` : ''}.
          </div>
        ) : !activity || activity.recent.length === 0 ? (
          <div className={styles.feedEmpty}>No activity yet.</div>
        ) : (
          <div className={styles.feedList}>
            {activity.recent.map((item) => (
              <FeedRow key={feedKey(item)} item={item} />
            ))}
          </div>
        )}
      </section>

      {/* 6. Meta */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Treasury info</h3>
        <div className={styles.metaGrid}>
          <div className={styles.metaCard}>
            <div className={styles.metaLabel}>Treasury address</div>
            <a
              className={styles.metaValue}
              href={fnAddressLink(FN_ADDRESSES.treasury)}
              target="_blank"
              rel="noopener noreferrer"
            >
              {FN_ADDRESSES.treasury}
            </a>
          </div>
          <div className={styles.metaCard}>
            <div className={styles.metaLabel}>Timelock admin</div>
            {adminAddr ? (
              <a
                className={styles.metaValue}
                href={fnAddressLink(adminAddr)}
                target="_blank"
                rel="noopener noreferrer"
              >
                {adminAddr}
              </a>
            ) : (
              <span className={styles.metaValue}>—</span>
            )}
          </div>
          <div className={styles.metaCard}>
            <div className={styles.metaLabel}>Execution delay</div>
            <span className={styles.metaValue}>
              {delayHours != null ? `${delayHours.toFixed(1)} h` : '—'}
            </span>
          </div>
          {activity && (
            <div className={styles.metaCard}>
              <div className={styles.metaLabel}>Lifetime queue</div>
              <span className={styles.metaValue}>
                {activity.totals.queuedCount + activity.totals.executedCount + activity.totals.cancelledCount}
                <span className={styles.metaSub}>
                  {' · '}
                  {activity.totals.queuedCount} queued
                  {' · '}
                  {activity.totals.executedCount} executed
                  {' · '}
                  {activity.totals.cancelledCount} cancelled
                </span>
              </span>
            </div>
          )}
        </div>
      </section>

      {/* 7. Treasury-owned Nouns */}
      {activity && activity.treasuryNouns.length > 0 && (
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>
            Food Nouns held ({activity.treasuryNouns.length})
          </h3>
          <div className={styles.nounsGrid}>
            {activity.treasuryNouns.map((n) => (
              <div className={styles.nounCard} key={n.id}>
                {n.svg ? (
                  <img
                    src={`data:image/svg+xml;base64,${n.svg}`}
                    alt={`Food Noun #${n.id}`}
                    className={styles.nounImage}
                  />
                ) : (
                  <div className={styles.nounImagePlaceholder} />
                )}
                <span className={styles.nounId}>{n.id}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

// =============================================================================
// Subcomponents
// =============================================================================

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className={styles.statCard}>
      <div className={styles.statLabel}>{label}</div>
      <div className={styles.statValue}>{value}</div>
      {sub && <div className={styles.statSub}>{sub}</div>}
    </div>
  );
}

function feedKey(item: FNTreasuryFeedItem): string {
  if (item.kind === 'inflow') return `inflow-${item.nounId}-${item.timestamp}`;
  return `${item.kind}-${item.txHash}-${item.timestamp}`;
}

function FeedRow({ item }: { item: FNTreasuryFeedItem }) {
  if (item.kind === 'inflow') {
    return <InflowRow item={item} />;
  }
  return <TimelockRow item={item} />;
}

function InflowRow({
  item,
}: {
  item: Extract<FNTreasuryFeedItem, { kind: 'inflow' }>;
}) {
  const ts = Number(item.timestamp);
  return (
    <div className={`${styles.feedRow} ${styles.feedRowInflow}`}>
      <span className={`${styles.feedKindBadge} ${styles.badgeInflow}`}>↑</span>
      <div className={styles.feedRowMain}>
        <div className={styles.feedRowHeader}>
          <span className={styles.feedHeadline}>
            Auction <span className={styles.feedAccent}>#{item.nounId}</span>
            <span className={styles.feedAmount}>
              {' '}
              · +Ξ {fmtEth(item.treasuryShareWei)}
            </span>
          </span>
          <span className={styles.feedDate}>{fmtRelativeDate(ts)}</span>
        </div>
        <div className={styles.feedRowSub}>
          <span>
            50% share of Ξ {fmtEth(item.amountWei)} bid by&nbsp;
            <AddressLink address={item.winner} />
          </span>
        </div>
      </div>
    </div>
  );
}

function TimelockRow({
  item,
}: {
  item: Extract<FNTreasuryFeedItem, { kind: 'execute' | 'cancel' }>;
}) {
  const ts = Number(item.timestamp);
  const isCancel = item.kind === 'cancel';
  const dec = item.decoded;

  // Always render the call signature/summary; for cancels we apply strikethrough.
  return (
    <div
      className={`${styles.feedRow} ${
        isCancel ? styles.feedRowCancel : styles.feedRowExecute
      }`}
    >
      <span
        className={`${styles.feedKindBadge} ${
          isCancel ? styles.badgeCancel : styles.badgeExecute
        }`}
        title={isCancel ? 'Cancelled' : 'Executed'}
      >
        {isCancel ? '✕' : '↓'}
      </span>
      <div className={styles.feedRowMain}>
        <div className={styles.feedRowHeader}>
          <span
            className={`${styles.feedHeadline} ${isCancel ? styles.muted : ''}`}
          >
            <CallHeadline decoded={dec} />
          </span>
          <span className={styles.feedDate}>{fmtRelativeDate(ts)}</span>
        </div>
        <div className={`${styles.feedRowSub} ${isCancel ? styles.muted : ''}`}>
          <CallDetails decoded={dec} />
          {item.txHash && (
            <>
              <span className={styles.feedDot}>·</span>
              <a
                className={styles.feedLink}
                href={fnTxLink(item.txHash)}
                target="_blank"
                rel="noopener noreferrer"
              >
                tx ↗
              </a>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function PendingRow({ item }: { item: FNTreasuryPendingItem }) {
  const eta = Number(item.eta);
  const queuedAt = Number(item.queuedTimestamp);
  const countdown = useEtaCountdown(eta);

  return (
    <div className={styles.pendingRow}>
      <div className={styles.pendingMain}>
        <div className={styles.feedRowHeader}>
          <span className={styles.feedHeadline}>
            <CallHeadline decoded={item.decoded} />
          </span>
          <span className={styles.pendingCountdown}>{countdown}</span>
        </div>
        <div className={styles.feedRowSub}>
          <CallDetails decoded={item.decoded} />
          <span className={styles.feedDot}>·</span>
          <span>queued {fmtRelativeDate(queuedAt)}</span>
          {item.queuedTxHash && (
            <>
              <span className={styles.feedDot}>·</span>
              <a
                className={styles.feedLink}
                href={fnTxLink(item.queuedTxHash)}
                target="_blank"
                rel="noopener noreferrer"
              >
                queue tx ↗
              </a>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Decoded-call rendering
// -----------------------------------------------------------------------------

function CallHeadline({ decoded }: { decoded: DecodedTreasuryTx }) {
  if (decoded.kind === 'eth-transfer') {
    return (
      <>
        Sent <span className={styles.feedAmount}>−Ξ {fmtEth(decoded.valueWei)}</span>
        {' to '}
        <AddressLink address={decoded.target} />
      </>
    );
  }
  if (decoded.kind === 'call') {
    return (
      <>
        <span className={styles.feedFnName}>{decoded.functionName}</span>
        {' on '}
        <AddressLink address={decoded.target} />
        {BigInt(decoded.valueWei) > BigInt(0) && (
          <span className={styles.feedAmount}>
            {' · −Ξ '}
            {fmtEth(decoded.valueWei)}
          </span>
        )}
      </>
    );
  }
  // Unknown
  return (
    <>
      Raw call on <AddressLink address={decoded.target} />
      {BigInt(decoded.valueWei) > BigInt(0) && (
        <span className={styles.feedAmount}>
          {' · −Ξ '}
          {fmtEth(decoded.valueWei)}
        </span>
      )}
    </>
  );
}

function CallDetails({ decoded }: { decoded: DecodedTreasuryTx }) {
  if (decoded.kind === 'eth-transfer') {
    return <span className={styles.feedMuted}>ETH transfer</span>;
  }
  if (decoded.kind === 'unknown') {
    return (
      <span className={styles.feedMuted}>
        could not decode · {decoded.dataPreview}
      </span>
    );
  }
  // Call: render comma-separated arg list
  if (decoded.inputs.length === 0) {
    return <span className={styles.feedMuted}>no arguments</span>;
  }
  return (
    <span className={styles.feedArgs}>
      {decoded.inputs.map((arg, i) => (
        <span key={i} className={styles.argChip}>
          {i > 0 && <span className={styles.argSep}>, </span>}
          {arg.name && <span className={styles.argName}>{arg.name}=</span>}
          <ArgValue arg={arg} />
        </span>
      ))}
    </span>
  );
}

function ArgValue({ arg }: { arg: DecodedInput }) {
  if (arg.isAddress && !arg.isArray) {
    return <AddressLink address={arg.value} />;
  }
  if (arg.isAmount) {
    return <span className={styles.argValueNum}>{fmtBigNumber(arg.value)}</span>;
  }
  if (arg.isBytes) {
    return (
      <span className={styles.argValueBytes} title={arg.value}>
        {previewHex(arg.value)}
      </span>
    );
  }
  if (arg.isArray) {
    let count = 0;
    try {
      const parsed = JSON.parse(arg.value);
      count = Array.isArray(parsed) ? parsed.length : 0;
    } catch {
      // ignore
    }
    return (
      <span className={styles.argValueArray}>
        {arg.type}[{count}]
      </span>
    );
  }
  return <span className={styles.argValue}>{arg.value}</span>;
}

// -----------------------------------------------------------------------------
// Address rendering — known-label > ENS > truncated hex; all link to Etherscan
// -----------------------------------------------------------------------------

function AddressLink({ address }: { address: string }) {
  const lc = address.toLowerCase();
  const known = KNOWN_FN_LABELS[lc];
  const { name } = useEnsData(lc);
  const display = known || (name ? formatAddress(lc, name) : truncateAddr(lc));

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (typeof window !== 'undefined') {
        window.open(fnAddressLink(lc), '_blank', 'noopener,noreferrer');
      }
    },
    [lc],
  );

  return (
    <button
      type="button"
      className={styles.addressLink}
      onClick={handleClick}
      title={lc}
    >
      {display}
    </button>
  );
}

// -----------------------------------------------------------------------------
// ETA countdown (ticks every second while ETA is in the future, else "ready")
// -----------------------------------------------------------------------------

function useEtaCountdown(etaUnix: number): string {
  // Re-renders the countdown every 30s so the "Executable in Xh Ym" label
  // stays roughly fresh without burning CPU. 30s is the right cadence for a
  // delay measured in hours/days; finer ticking would just churn paints.
  const [label, setLabel] = useState(() => formatEtaDelta(etaUnix));
  useEffect(() => {
    setLabel(formatEtaDelta(etaUnix));
    const id = setInterval(() => setLabel(formatEtaDelta(etaUnix)), 30_000);
    return () => clearInterval(id);
  }, [etaUnix]);
  return label;
}

function formatEtaDelta(etaUnix: number): string {
  const now = Math.floor(Date.now() / 1000);
  const delta = etaUnix - now;
  if (delta <= 0) return 'Ready to execute';
  const h = Math.floor(delta / 3600);
  const m = Math.floor((delta % 3600) / 60);
  if (h >= 24) {
    const d = Math.floor(h / 24);
    const rh = h % 24;
    return `Executable in ${d}d ${rh}h`;
  }
  if (h > 0) return `Executable in ${h}h ${m}m`;
  return `Executable in ${m}m`;
}

// -----------------------------------------------------------------------------
// Small formatters
// -----------------------------------------------------------------------------

function fmtRelativeDate(unix: number): string {
  if (!unix) return '—';
  const now = Date.now() / 1000;
  const delta = now - unix;
  if (delta < 60) return 'just now';
  if (delta < 3600) return `${Math.floor(delta / 60)}m ago`;
  if (delta < 86400) return `${Math.floor(delta / 3600)}h ago`;
  if (delta < 86400 * 7) return `${Math.floor(delta / 86400)}d ago`;
  const d = new Date(unix * 1000);
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString(
    'en-US',
    sameYear
      ? { month: 'short', day: 'numeric' }
      : { month: 'short', day: 'numeric', year: 'numeric' },
  );
}

function fmtBigNumber(s: string): string {
  if (!s) return '0';
  // For huge integers, comma-separate thousands. We don't infer decimals here
  // since the type alone isn't enough (uint256 can be a Wei amount or a count).
  // Renderer-side heuristics (e.g. "amount" name) could improve this later.
  try {
    const n = BigInt(s);
    return n.toLocaleString('en-US');
  } catch {
    return s;
  }
}

function previewHex(s: string): string {
  if (!s.startsWith('0x') || s.length <= 18) return s;
  return `${s.slice(0, 18)}…`;
}
