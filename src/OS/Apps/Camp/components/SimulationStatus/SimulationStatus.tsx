/**
 * SimulationStatus Component
 * Displays the result of transaction simulation with decoded transaction details
 */

'use client';

import { useMemo, useState } from 'react';
import { useEnsName } from 'wagmi';
import { mainnet } from 'wagmi/chains';
import { keccak256, toBytes, slice } from 'viem';
import type { SimulationResult, TransactionResult, ProposalAction } from '../../hooks/useSimulation';
import { decodeTransactions, type DecodedTransaction } from '../../utils/transactionDecoder';
import { NounImageById } from '@/app/lib/nouns/components';
import styles from './SimulationStatus.module.css';

// Nouns DAO Executor (Timelock) - this is the address that executes proposals
const NOUNS_EXECUTOR = '0xb1a32FC9F9D8b2cf86C068Cae13108809547ef71';

/**
 * Encode function signature and calldata into transaction data
 */
function encodeTransactionData(signature: string, calldata: string): string {
  if (!signature) {
    return calldata || '0x';
  }
  const selector = slice(keccak256(toBytes(signature)), 0, 4);
  const calldataWithoutPrefix = calldata.startsWith('0x') ? calldata.slice(2) : calldata;
  return selector + calldataWithoutPrefix;
}

/**
 * Generate Tenderly simulator URL for a transaction
 */
function getTenderlySimulatorUrl(action: ProposalAction): string {
  const data = encodeTransactionData(action.signature, action.calldata);
  const value = action.value === '0' ? '0' : action.value;
  
  const params = new URLSearchParams({
    network: '1', // Ethereum mainnet
    from: NOUNS_EXECUTOR,
    contractAddress: action.target,
    value: value,
    rawFunctionInput: data,
    gas: '8000000',
    gasPrice: '0',
  });
  
  return `https://dashboard.tenderly.co/simulator/new?${params.toString()}`;
}

interface SimulationStatusProps {
  result: SimulationResult | undefined;
  isLoading: boolean;
  error: Error | null;
  hasActions: boolean;
  actions?: ProposalAction[];
  compact?: boolean;
  /** Skip simulation display but still show transactions */
  skipSimulation?: boolean;
}

function formatGas(gasUsed: string): string {
  const gas = parseInt(gasUsed, 10);
  if (isNaN(gas)) return '0';
  if (gas > 1000000) {
    return `${(gas / 1000000).toFixed(2)}M`;
  }
  if (gas > 1000) {
    return `${(gas / 1000).toFixed(1)}K`;
  }
  return gas.toString();
}

// Component to display an address with ENS resolution
function AddressWithENS({ address, className }: { address: string; className?: string }) {
  const { data: ensName } = useEnsName({
    address: address as `0x${string}`,
    chainId: mainnet.id,
  });
  
  const display = ensName || `${address.slice(0, 6)}...${address.slice(-4)}`;
  
  return (
    <span className={className || styles.address} title={address}>
      {display}
    </span>
  );
}

// Component to display a single decoded transaction
function TransactionRow({ 
  decoded,
  result, 
  index,
  action,
  showTenderlyLink = false,
}: { 
  decoded: DecodedTransaction;
  result?: TransactionResult; 
  index: number;
  action?: ProposalAction;
  /** Only show per-transaction Tenderly link when there's no shared simulation URL */
  showTenderlyLink?: boolean;
}) {
  const [showDetails, setShowDetails] = useState(false);
  const success = result?.success !== false;
  
  // Get recipient address from params
  const recipientAddress = decoded.params?.to;
  const contractAddress = decoded.params?.contract;
  
  // Check if this is a Noun transfer
  const nounId = decoded.params?.nounId;
  
  // Check if we have detailed call info to show
  const hasDetails = decoded.formattedCall && decoded.formattedCall.length > 0;
  
  return (
    <div className={`${styles.transactionRow} ${success ? styles.success : styles.failed}`}>
      <div className={styles.transactionHeader}>
        <span className={styles.transactionIcon}>
          {success ? '✓' : '✗'}
        </span>
        <span className={styles.transactionIndex}>#{index + 1}</span>
        <div className={styles.transactionTitleContainer}>
          <span className={styles.transactionTitle}>{decoded.title}</span>
          {nounId && (
            <NounImageById id={parseInt(nounId, 10)} size={20} className={styles.nounImage} />
          )}
        </div>
        {result && parseInt(result.gasUsed, 10) > 0 && (
          <span className={styles.transactionGas}>
            {formatGas(result.gasUsed)} gas
          </span>
        )}
      </div>
      
      <div className={styles.transactionMeta}>
        {recipientAddress && (
          <div className={styles.metaRow}>
            <span className={styles.metaLabel}>To:</span>
            <AddressWithENS address={recipientAddress} className={styles.recipientAddress} />
          </div>
        )}
        {/* Show contract address for unknown contracts */}
        {!recipientAddress && contractAddress && (
          <div className={styles.metaRow}>
            <span className={styles.metaLabel}>Contract:</span>
            <AddressWithENS address={contractAddress} className={styles.recipientAddress} />
          </div>
        )}
        {decoded.description && (
          <div className={styles.metaRow}>
            {decoded.description}
          </div>
        )}
      </div>
      
      {/* Expandable details for unknown functions */}
      {hasDetails && (
        <div className={styles.detailsSection}>
          <button 
            className={styles.detailsToggle}
            onClick={() => setShowDetails(!showDetails)}
          >
            {showDetails ? 'Hide details ▲' : 'Show details ▼'}
          </button>
          {showDetails && (
            <pre className={styles.codeBlock}>
              {decoded.formattedCall?.join('\n')}
            </pre>
          )}
        </div>
      )}
      
      {!success && result && (
        <div className={styles.transactionError}>
          {result.errorMessage || result.error || 'Transaction failed'}
        </div>
      )}
      
      {/* Tenderly link for each transaction (only when no shared URL) */}
      {showTenderlyLink && action && (
        <a 
          href={getTenderlySimulatorUrl(action)}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.tenderlyLink}
          onClick={(e) => e.stopPropagation()}
        >
          Verify on Tenderly →
        </a>
      )}
    </div>
  );
}

// Static transaction row without simulation results (for executed proposals)
function TransactionRowStatic({ 
  decoded,
  index,
}: { 
  decoded: DecodedTransaction;
  index: number;
}) {
  const [showDetails, setShowDetails] = useState(false);
  
  // Get recipient address from params
  const recipientAddress = decoded.params?.to;
  const contractAddress = decoded.params?.contract;
  
  // Check if this is a Noun transfer
  const nounId = decoded.params?.nounId;
  
  // Check if we have detailed call info to show
  const hasDetails = decoded.formattedCall && decoded.formattedCall.length > 0;
  
  return (
    <div className={styles.transactionRow}>
      <div className={styles.transactionHeader}>
        <span className={styles.transactionIndex}>#{index + 1}</span>
        <div className={styles.transactionTitleContainer}>
          <span className={styles.transactionTitle}>{decoded.title}</span>
          {nounId && (
            <NounImageById id={parseInt(nounId, 10)} size={20} className={styles.nounImage} />
          )}
        </div>
      </div>
      
      <div className={styles.transactionMeta}>
        {recipientAddress && (
          <div className={styles.metaRow}>
            <span className={styles.metaLabel}>To:</span>
            <AddressWithENS address={recipientAddress} className={styles.recipientAddress} />
          </div>
        )}
        {/* Show contract address for unknown contracts */}
        {!recipientAddress && contractAddress && (
          <div className={styles.metaRow}>
            <span className={styles.metaLabel}>Contract:</span>
            <AddressWithENS address={contractAddress} className={styles.recipientAddress} />
          </div>
        )}
        {decoded.description && (
          <div className={styles.metaRow}>
            {decoded.description}
          </div>
        )}
      </div>
      
      {/* Expandable details for unknown functions */}
      {hasDetails && (
        <div className={styles.detailsSection}>
          <button 
            className={styles.detailsToggle}
            onClick={() => setShowDetails(!showDetails)}
          >
            {showDetails ? 'Hide details ▲' : 'Show details ▼'}
          </button>
          {showDetails && (
            <pre className={styles.codeBlock}>
              {decoded.formattedCall?.join('\n')}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

export function SimulationStatus({ 
  result, 
  isLoading, 
  error, 
  hasActions,
  actions,
  compact = false,
  skipSimulation = false
}: SimulationStatusProps) {
  // All hooks must be called before any conditional returns
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Decode all transactions with context awareness
  const decodedTxns = useMemo(() => {
    if (!actions || actions.length === 0) return [];
    return decodeTransactions(actions);
  }, [actions]);
  
  const actionCount = actions?.length || 0;
  
  // No actions to show
  if (!actions || actions.length === 0) {
    return null;
  }
  
  // Skip simulation mode: just show transactions without simulation results
  if (skipSimulation) {
    return (
      <div className={styles.container}>
        <button 
          className={styles.sectionHeader}
          onClick={() => setIsExpanded(!isExpanded)}
          aria-expanded={isExpanded}
        >
          <span className={styles.sectionTitle}>Transactions</span>
          <span className={styles.sectionMeta}>
            {actionCount} transaction{actionCount !== 1 ? 's' : ''}
          </span>
          <span className={`${styles.chevron} ${isExpanded ? styles.expanded : ''}`}>
            ▼
          </span>
        </button>
        
        {isExpanded && (
          <div className={styles.collapsibleContent}>
            <div className={styles.transactions}>
              {actions.map((action, index) => (
                <TransactionRowStatic 
                  key={index} 
                  decoded={decodedTxns[index] || { title: 'Unknown', target: action.target, functionName: '', value: action.value }}
                  index={index} 
                />
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }
  
  if (!hasActions) {
    return null;
  }
  
  if (isLoading) {
    return (
      <div className={`${styles.container} ${styles.loading} ${compact ? styles.compact : ''}`}>
        <span className={styles.loadingIcon}>...</span>
        <span className={styles.loadingText}>Simulating transactions</span>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className={`${styles.container} ${styles.error} ${compact ? styles.compact : ''}`}>
        <span className={styles.icon}>✗</span>
        <span className={styles.text}>Simulation failed: {error.message}</span>
      </div>
    );
  }
  
  if (!result) {
    return null;
  }
  
  // Compact mode: just show overall status
  if (compact) {
    return (
      <div className={`${styles.container} ${result.success ? styles.success : styles.failed} ${styles.compact}`}>
        <span className={styles.icon}>
          {result.success ? '✓' : '✗'}
        </span>
        <span className={styles.text}>
          {result.success 
            ? `Simulation passed (${formatGas(result.totalGasUsed)} gas)`
            : 'Simulation failed'}
        </span>
      </div>
    );
  }
  
  // Full mode: collapsible transactions section
  return (
    <div className={`${styles.container} ${result.success ? styles.success : styles.failed}`}>
      <button 
        className={styles.sectionHeader}
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
      >
        <span className={styles.sectionTitle}>Transactions</span>
        <span className={styles.sectionMeta}>
          <span className={styles.icon}>
            {result.success ? '✓' : '✗'}
          </span>
          {actionCount} transaction{actionCount !== 1 ? 's' : ''}
        </span>
        <span className={`${styles.chevron} ${isExpanded ? styles.expanded : ''}`}>
          ▼
        </span>
      </button>
      
      {isExpanded && (
        <div className={styles.collapsibleContent}>
          {actions && actions.length > 0 && (
            <div className={styles.transactions}>
              {actions.map((action, index) => (
                <TransactionRow 
                  key={index} 
                  decoded={decodedTxns[index] || { title: 'Unknown', target: action.target, functionName: '', value: action.value }}
                  result={result.results[index]} 
                  index={index} 
                  action={action}
                  showTenderlyLink={!result.shareUrl}
                />
              ))}
            </div>
          )}
          
          <div className={styles.footer}>
            <div className={styles.footerTop}>
            <span className={styles.icon}>
              {result.success ? '✓' : '✗'}
            </span>
            <span className={styles.statusText}>
              {result.success ? 'Simulation Passed' : 'Simulation Failed'}
            </span>
            {parseInt(result.totalGasUsed, 10) > 0 && (
              <span className={styles.gasTotal}>
                {formatGas(result.totalGasUsed)} total gas
              </span>
              )}
            </div>
            {/* Shareable Tenderly link (when Dashboard API is configured) */}
            {result.shareUrl && (
              <a 
                href={result.shareUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.shareLink}
              >
                View full simulation on Tenderly →
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
