/**
 * NounV2 treasury overview — ETH balance, beneficiary, ownership snapshot.
 * The treasury holds both ETH and any ERC-20s sent to it; this v1 only shows
 * ETH. ERC-20 holdings can be added once we wire treasury_v2_balances.
 */

'use client';

import { useV2TreasuryBalance, useV2Beneficiary } from '../hooks/useV2Treasury';
import { V2_ADDRESSES, v2AddressLink } from '../contracts';
import { fmtEth, truncateAddr } from '../utils/format';
import { useEnsDataBatch, getEnsFromMap } from '@/OS/hooks/useEnsData';
import styles from './TreasuryView.module.css';

export function TreasuryView() {
  const balance = useV2TreasuryBalance();
  const beneficiary = useV2Beneficiary();
  const { data: ensMap } = useEnsDataBatch([
    V2_ADDRESSES.treasury,
    V2_ADDRESSES.safe,
    (beneficiary.data as `0x${string}` | undefined) ?? V2_ADDRESSES.treasury,
  ]);
  const display = (addr: string) => getEnsFromMap(ensMap, addr).name ?? truncateAddr(addr);

  return (
    <div className={styles.view}>
      <div className={styles.heroRow}>
        <div className={styles.heroCard}>
          <div className={styles.heroLabel}>Treasury balance</div>
          <div className={styles.heroValue}>
            Ξ {balance.isLoading ? '…' : fmtEth(balance.data ?? BigInt(0))}
          </div>
        </div>
        <div className={styles.heroCard}>
          <div className={styles.heroLabel}>Auction beneficiary</div>
          <div className={styles.heroValueSmall}>
            {beneficiary.data ? display(beneficiary.data as string) : '…'}
          </div>
          <div className={styles.heroSubtle}>
            ETH from each settled auction goes here.
          </div>
        </div>
      </div>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Contract registry</h3>
        <ul className={styles.contractList}>
          <ContractRow label="Treasury / Governor" address={V2_ADDRESSES.treasury} display={display} />
          <ContractRow label="NounV2 Token" address={V2_ADDRESSES.token} display={display} />
          <ContractRow label="Auction House" address={V2_ADDRESSES.auctionHouse} display={display} />
          <ContractRow
            label="Descriptor (V2-owned)"
            address={V2_ADDRESSES.descriptor}
            display={display}
          />
          <ContractRow label="NounsArt" address={V2_ADDRESSES.art} display={display} />
          <ContractRow label="Slobber Seeder" address={V2_ADDRESSES.seeder} display={display} />
          <ContractRow
            label="Safe (admin / vetoer)"
            address={V2_ADDRESSES.safe}
            display={display}
          />
        </ul>
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Ownership snapshot</h3>
        <p className={styles.note}>
          NounV2Token is owned by the Treasury (DAO-controlled).
          AuctionHouse is owned by the Treasury — auction params now require a passing V2
          governance proposal. Treasury admin (veto-only) is the multisig Safe.
        </p>
      </section>
    </div>
  );
}

function ContractRow({
  label,
  address,
  display,
}: {
  label: string;
  address: `0x${string}`;
  display: (a: string) => string;
}) {
  return (
    <li className={styles.contractRow}>
      <span className={styles.contractLabel}>{label}</span>
      <a
        href={v2AddressLink(address)}
        target="_blank"
        rel="noopener noreferrer"
        className={styles.contractLink}
      >
        {display(address)} ↗
      </a>
    </li>
  );
}
