/**
 * Action Templates for Nouns Proposal Creation
 * Business logic for generating proposal actions from user-friendly inputs
 */

import { Address, encodeAbiParameters, parseAbiParameters } from 'viem';
import { NOUNS_ADDRESSES, BERRY_CLIENT_ID } from '@/app/lib/nouns';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export type ActionTemplateType =
  | 'treasury-eth'
  | 'treasury-usdc'
  | 'treasury-weth'
  | 'treasury-erc20-custom'
  | 'swap-buy-eth'
  | 'swap-sell-eth'
  | 'noun-transfer'
  | 'noun-swap'
  | 'noun-delegate'
  | 'auction-bid'
  | 'payment-stream'
  | 'payment-once'
  | 'admin-voting-delay'
  | 'admin-voting-period'
  | 'admin-proposal-threshold'
  | 'admin-last-minute-window'
  | 'admin-objection-period'
  | 'admin-updatable-period'
  | 'admin-min-quorum'
  | 'admin-max-quorum'
  | 'admin-quorum-coefficient'
  | 'admin-dynamic-quorum'
  | 'admin-fork-period'
  | 'admin-fork-threshold'
  | 'admin-fork-deployer'
  | 'admin-fork-escrow'
  | 'admin-fork-tokens'
  | 'admin-pending-admin'
  | 'admin-timelock-delay'
  | 'admin-timelock-admin'
  | 'meta-propose'
  | 'custom';

export interface ProposalAction {
  target: string;
  value: string;
  signature: string;
  calldata: string;
  // Multi-action metadata
  isPartOfMultiAction?: boolean;
  multiActionGroupId?: string;
  multiActionIndex?: number;
}

export interface ActionTemplate {
  id: ActionTemplateType;
  category: 'treasury' | 'swaps' | 'nouns' | 'payments' | 'admin' | 'meta' | 'custom';
  name: string;
  description: string;
  isMultiAction: boolean;
  fields: ActionField[];
}

export interface ActionField {
  name: string;
  label: string;
  type: 'address' | 'amount' | 'number' | 'select' | 'date' | 'text' | 'token-select';
  placeholder?: string;
  required?: boolean;
  options?: { label: string; value: string }[];
  validation?: {
    min?: number;
    max?: number;
    decimals?: number;
  };
  helpText?: string;
}

export interface TokenInfo {
  symbol: string;
  address: Address;
  decimals: number;
  balance?: bigint;
  name?: string;
}

export interface TemplateFieldValues {
  [key: string]: string | undefined;
}

export interface ActionTemplateState {
  templateId: ActionTemplateType | 'custom';
  fieldValues: TemplateFieldValues;
  generatedActions: ProposalAction[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const COMMON_TOKENS: TokenInfo[] = [
  { symbol: 'USDC', address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', decimals: 6 },
  { symbol: 'WETH', address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', decimals: 18 },
  { symbol: 'DAI', address: '0x6B175474E89094C44Da98b954EedeAC495271d0F', decimals: 18 },
  { symbol: 'USDT', address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', decimals: 6 },
  { symbol: 'stETH', address: '0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84', decimals: 18 },
  { symbol: 'wstETH', address: '0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0', decimals: 18 },
  { symbol: 'rETH', address: '0xae78736Cd615f374D3085123A210448E74Fc6393', decimals: 18 },
];

export const EXTERNAL_CONTRACTS = {
  USDC: { address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' as Address },
  WETH: { address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2' as Address },
  DAI: { address: '0x6B175474E89094C44Da98b954EedeAC495271d0F' as Address },
};

export const TREASURY_ADDRESS = NOUNS_ADDRESSES.treasury as Address;
export const NOUNS_TOKEN_ADDRESS = NOUNS_ADDRESSES.token as Address;
export const DAO_PROXY_ADDRESS = NOUNS_ADDRESSES.governor as Address;
export const STREAM_FACTORY_ADDRESS = '0x0fd206FC7A7dBcD5661157eDCb1FFDD0D02A61ff' as Address;

// ============================================================================
// ACTION TEMPLATE REGISTRY
// ============================================================================

export const ACTION_TEMPLATES: Record<ActionTemplateType, ActionTemplate> = {
  // Treasury Transfers
  'treasury-eth': {
    id: 'treasury-eth',
    category: 'treasury',
    name: 'Send ETH from Treasury',
    description: 'Transfer ETH from the Nouns DAO treasury to a recipient',
    isMultiAction: false,
    fields: [
      {
        name: 'recipient',
        label: 'Recipient Address',
        type: 'address',
        placeholder: '0x... or ENS name',
        required: true,
        helpText: 'Address that will receive the ETH'
      },
      {
        name: 'amount',
        label: 'Amount (ETH)',
        type: 'amount',
        placeholder: '0.0',
        required: true,
        validation: { min: 0, decimals: 18 },
        helpText: 'Amount of ETH to send'
      }
    ]
  },

  'treasury-usdc': {
    id: 'treasury-usdc',
    category: 'treasury',
    name: 'Send USDC from Treasury',
    description: 'Transfer USDC from the treasury to a recipient',
    isMultiAction: false,
    fields: [
      {
        name: 'recipient',
        label: 'Recipient Address',
        type: 'address',
        placeholder: '0x... or ENS name',
        required: true
      },
      {
        name: 'amount',
        label: 'Amount (USDC)',
        type: 'amount',
        placeholder: '0.0',
        required: true,
        validation: { min: 0, decimals: 6 }
      }
    ]
  },

  'treasury-weth': {
    id: 'treasury-weth',
    category: 'treasury',
    name: 'Send WETH from Treasury',
    description: 'Transfer WETH from the treasury to a recipient',
    isMultiAction: false,
    fields: [
      {
        name: 'recipient',
        label: 'Recipient Address',
        type: 'address',
        placeholder: '0x... or ENS name',
        required: true
      },
      {
        name: 'amount',
        label: 'Amount (WETH)',
        type: 'amount',
        placeholder: '0.0',
        required: true,
        validation: { min: 0, decimals: 18 }
      }
    ]
  },

  'treasury-erc20-custom': {
    id: 'treasury-erc20-custom',
    category: 'treasury',
    name: 'Send ERC20 Token from Treasury',
    description: 'Transfer any ERC20 token from the treasury to a recipient',
    isMultiAction: false,
    fields: [
      {
        name: 'token',
        label: 'Token',
        type: 'token-select',
        required: true,
        helpText: 'Select token or enter custom address'
      },
      {
        name: 'recipient',
        label: 'Recipient Address',
        type: 'address',
        placeholder: '0x... or ENS name',
        required: true
      },
      {
        name: 'amount',
        label: 'Amount',
        type: 'amount',
        placeholder: '0.0',
        required: true,
        validation: { min: 0 }
      }
    ]
  },

  // Treasury Swaps
  'swap-buy-eth': {
    id: 'swap-buy-eth',
    category: 'swaps',
    name: 'Buy ETH with USDC',
    description: 'Use TokenBuyer to swap treasury USDC for ETH',
    isMultiAction: false,
    fields: [
      {
        name: 'ethAmount',
        label: 'ETH Amount to Buy',
        type: 'amount',
        placeholder: '0.0',
        required: true,
        validation: { min: 0, decimals: 18 },
        helpText: 'Amount of ETH the treasury will receive'
      }
    ]
  },

  'swap-sell-eth': {
    id: 'swap-sell-eth',
    category: 'swaps',
    name: 'Sell ETH for USDC',
    description: 'Use TokenBuyer to sell treasury ETH for USDC',
    isMultiAction: false,
    fields: [
      {
        name: 'ethAmount',
        label: 'ETH Amount to Sell',
        type: 'amount',
        placeholder: '0.0',
        required: true,
        validation: { min: 0, decimals: 18 }
      }
    ]
  },

  // Nouns Operations
  'noun-transfer': {
    id: 'noun-transfer',
    category: 'nouns',
    name: 'Transfer Noun from Treasury',
    description: 'Transfer a Noun NFT from treasury to recipient',
    isMultiAction: false,
    fields: [
      {
        name: 'nounId',
        label: 'Noun ID',
        type: 'number',
        placeholder: '123',
        required: true,
        validation: { min: 0 },
        helpText: 'ID of the Noun to transfer'
      },
      {
        name: 'recipient',
        label: 'Recipient Address',
        type: 'address',
        placeholder: '0x... or ENS name',
        required: true
      }
    ]
  },

  'noun-swap': {
    id: 'noun-swap',
    category: 'nouns',
    name: 'Swap Nouns with Treasury',
    description: 'Your Noun + optional tip → Treasury Noun',
    isMultiAction: true,
    fields: [
      {
        name: 'userAddress',
        label: 'Your Address',
        type: 'address',
        placeholder: '0x... or ENS name',
        required: true,
        helpText: 'Your wallet address (auto-detected)'
      },
      {
        name: 'userNounId',
        label: 'Your Noun',
        type: 'number',
        placeholder: 'Select from your Nouns',
        required: true,
        validation: { min: 0 },
        helpText: 'Noun you are offering'
      },
      {
        name: 'treasuryNounId',
        label: 'Treasury Noun',
        type: 'number',
        placeholder: 'Select from treasury Nouns',
        required: true,
        validation: { min: 0 },
        helpText: 'Noun you want from treasury'
      },
      {
        name: 'tipCurrency',
        label: 'Tip Currency',
        type: 'select',
        required: false,
        helpText: 'Tip',
        options: [
          { label: 'No Tip', value: '' },
          { label: 'ETH', value: 'eth' },
          { label: 'WETH', value: 'weth' },
          { label: 'USDC', value: 'usdc' }
        ]
      },
      {
        name: 'tipAmount',
        label: 'Tip Amount',
        type: 'amount',
        placeholder: '0.0',
        required: false,
        validation: { min: 0 },
        helpText: 'Optional amount to tip'
      }
    ]
  },

  'noun-delegate': {
    id: 'noun-delegate',
    category: 'nouns',
    name: 'Delegate Treasury Nouns',
    description: 'Delegate voting power of treasury-owned Nouns',
    isMultiAction: false,
    fields: [
      {
        name: 'delegatee',
        label: 'Delegate To',
        type: 'address',
        placeholder: '0x... or ENS name',
        required: true,
        helpText: 'Address that will receive voting power'
      }
    ]
  },

  'auction-bid': {
    id: 'auction-bid',
    category: 'nouns',
    name: 'Bid on Noun Auction',
    description: 'Place a bid on a Noun auction using Governor contract funds',
    isMultiAction: false,
    fields: [
      {
        name: 'nounId',
        label: 'Noun ID',
        type: 'number',
        placeholder: '1234',
        required: true,
        validation: { min: 0 },
        helpText: 'The ID of the Noun to bid on'
      },
      {
        name: 'bidAmount',
        label: 'Bid Amount (ETH)',
        type: 'amount',
        placeholder: '100',
        required: true,
        validation: { min: 0, decimals: 18 },
        helpText: 'Amount of ETH to bid from Governor contract'
      }
    ]
  },

  // Payment Streams
  'payment-stream': {
    id: 'payment-stream',
    category: 'payments',
    name: 'Create Payment Stream',
    description: 'Create a streaming payment via StreamFactory',
    isMultiAction: true,
    fields: [
      {
        name: 'recipient',
        label: 'Recipient Address',
        type: 'address',
        placeholder: '0x...',
        required: true
      },
      {
        name: 'tokenAddress',
        label: 'Token',
        type: 'token-select',
        required: true,
        helpText: 'Select token from Nouns Treasury'
      },
      {
        name: 'amount',
        label: 'Total Amount',
        type: 'amount',
        placeholder: '1000',
        required: true,
        helpText: 'Total amount to stream (will be paid out gradually)'
      },
      {
        name: 'startDate',
        label: 'Start Date',
        type: 'date',
        required: true,
        helpText: 'When the stream begins'
      },
      {
        name: 'endDate',
        label: 'End Date',
        type: 'date',
        required: true,
        helpText: 'When the stream ends'
      },
      {
        name: 'streamAddress',
        label: 'Predicted Stream Address',
        type: 'address',
        placeholder: '0x... (computed automatically)',
        required: true,
        helpText: 'The deterministic address where the stream contract will be created'
      }
    ]
  },

  'payment-once': {
    id: 'payment-once',
    category: 'payments',
    name: 'One-time Payment',
    description: 'Send USDC payment via Payer contract',
    isMultiAction: false,
    fields: [
      {
        name: 'recipient',
        label: 'Recipient Address',
        type: 'address',
        placeholder: '0x... or ENS name',
        required: true
      },
      {
        name: 'amount',
        label: 'Amount (USDC)',
        type: 'amount',
        placeholder: '0.0',
        required: true,
        validation: { min: 0, decimals: 6 }
      }
    ]
  },

  // Admin Functions - Voting Parameters
  'admin-voting-delay': {
    id: 'admin-voting-delay',
    category: 'admin',
    name: 'Set Voting Delay',
    description: 'Adjust blocks between proposal creation and voting start',
    isMultiAction: false,
    fields: [
      {
        name: 'blocks',
        label: 'Voting Delay (blocks)',
        type: 'number',
        placeholder: '14400',
        required: true,
        validation: { min: 0 },
        helpText: '~1 day = 7200 blocks'
      }
    ]
  },

  'admin-voting-period': {
    id: 'admin-voting-period',
    category: 'admin',
    name: 'Set Voting Period',
    description: 'Adjust voting period duration in blocks',
    isMultiAction: false,
    fields: [
      {
        name: 'blocks',
        label: 'Voting Period (blocks)',
        type: 'number',
        placeholder: '50400',
        required: true,
        validation: { min: 1 },
        helpText: '~7 days = 50400 blocks'
      }
    ]
  },

  'admin-proposal-threshold': {
    id: 'admin-proposal-threshold',
    category: 'admin',
    name: 'Set Proposal Threshold BPS',
    description: 'Adjust minimum Nouns needed to propose',
    isMultiAction: false,
    fields: [
      {
        name: 'bps',
        label: 'Threshold (BPS)',
        type: 'number',
        placeholder: '25',
        required: true,
        validation: { min: 0, max: 1000 },
        helpText: '100 BPS = 1%, max 1000 BPS = 10%'
      }
    ]
  },

  'admin-last-minute-window': {
    id: 'admin-last-minute-window',
    category: 'admin',
    name: 'Set Last Minute Window',
    description: 'Adjust last-minute voting extension window',
    isMultiAction: false,
    fields: [
      {
        name: 'blocks',
        label: 'Window (blocks)',
        type: 'number',
        placeholder: '7200',
        required: true,
        validation: { min: 0 }
      }
    ]
  },

  'admin-objection-period': {
    id: 'admin-objection-period',
    category: 'admin',
    name: 'Set Objection Period',
    description: 'Adjust objection period after voting ends',
    isMultiAction: false,
    fields: [
      {
        name: 'blocks',
        label: 'Objection Period (blocks)',
        type: 'number',
        placeholder: '7200',
        required: true,
        validation: { min: 0 }
      }
    ]
  },

  'admin-updatable-period': {
    id: 'admin-updatable-period',
    category: 'admin',
    name: 'Set Updatable Period',
    description: 'Adjust period proposals can be updated',
    isMultiAction: false,
    fields: [
      {
        name: 'blocks',
        label: 'Updatable Period (blocks)',
        type: 'number',
        placeholder: '7200',
        required: true,
        validation: { min: 0 }
      }
    ]
  },

  // Admin Functions - Quorum Parameters
  'admin-min-quorum': {
    id: 'admin-min-quorum',
    category: 'admin',
    name: 'Set Min Quorum BPS',
    description: 'Adjust minimum quorum',
    isMultiAction: false,
    fields: [
      {
        name: 'bps',
        label: 'Min Quorum (BPS)',
        type: 'number',
        placeholder: '1000',
        required: true,
        validation: { min: 0, max: 2000 },
        helpText: '1000 BPS = 10%, max 2000 BPS = 20%'
      }
    ]
  },

  'admin-max-quorum': {
    id: 'admin-max-quorum',
    category: 'admin',
    name: 'Set Max Quorum BPS',
    description: 'Adjust maximum quorum',
    isMultiAction: false,
    fields: [
      {
        name: 'bps',
        label: 'Max Quorum (BPS)',
        type: 'number',
        placeholder: '2000',
        required: true,
        validation: { min: 0, max: 6000 },
        helpText: '2000 BPS = 20%, max 6000 BPS = 60%'
      }
    ]
  },

  'admin-quorum-coefficient': {
    id: 'admin-quorum-coefficient',
    category: 'admin',
    name: 'Set Quorum Coefficient',
    description: 'Adjust dynamic quorum coefficient',
    isMultiAction: false,
    fields: [
      {
        name: 'coefficient',
        label: 'Quorum Coefficient',
        type: 'number',
        placeholder: '1000000',
        required: true,
        validation: { min: 0 }
      }
    ]
  },

  'admin-dynamic-quorum': {
    id: 'admin-dynamic-quorum',
    category: 'admin',
    name: 'Set Dynamic Quorum Params',
    description: 'Update all quorum parameters at once',
    isMultiAction: false,
    fields: [
      {
        name: 'minBps',
        label: 'Min Quorum (BPS)',
        type: 'number',
        placeholder: '1000',
        required: true,
        validation: { min: 0, max: 2000 }
      },
      {
        name: 'maxBps',
        label: 'Max Quorum (BPS)',
        type: 'number',
        placeholder: '2000',
        required: true,
        validation: { min: 0, max: 6000 }
      },
      {
        name: 'coefficient',
        label: 'Coefficient',
        type: 'number',
        placeholder: '1000000',
        required: true,
        validation: { min: 0 }
      }
    ]
  },

  // Admin Functions - Fork Mechanism
  'admin-fork-period': {
    id: 'admin-fork-period',
    category: 'admin',
    name: 'Set Fork Period',
    description: 'Adjust fork escrow period duration',
    isMultiAction: false,
    fields: [
      {
        name: 'seconds',
        label: 'Fork Period (seconds)',
        type: 'number',
        placeholder: '1209600',
        required: true,
        validation: { min: 0 },
        helpText: '14 days = 1209600 seconds'
      }
    ]
  },

  'admin-fork-threshold': {
    id: 'admin-fork-threshold',
    category: 'admin',
    name: 'Set Fork Threshold BPS',
    description: 'Adjust Nouns needed to trigger fork',
    isMultiAction: false,
    fields: [
      {
        name: 'bps',
        label: 'Fork Threshold (BPS)',
        type: 'number',
        placeholder: '2000',
        required: true,
        validation: { min: 0, max: 10000 },
        helpText: '2000 BPS = 20%'
      }
    ]
  },

  'admin-fork-deployer': {
    id: 'admin-fork-deployer',
    category: 'admin',
    name: 'Set Fork DAO Deployer',
    description: 'Update fork deployer contract address',
    isMultiAction: false,
    fields: [
      {
        name: 'address',
        label: 'Fork Deployer Address',
        type: 'address',
        placeholder: '0x...',
        required: true
      }
    ]
  },

  'admin-fork-escrow': {
    id: 'admin-fork-escrow',
    category: 'admin',
    name: 'Set Fork Escrow',
    description: 'Update fork escrow contract address',
    isMultiAction: false,
    fields: [
      {
        name: 'address',
        label: 'Fork Escrow Address',
        type: 'address',
        placeholder: '0x...',
        required: true
      }
    ]
  },

  'admin-fork-tokens': {
    id: 'admin-fork-tokens',
    category: 'admin',
    name: 'Set Fork ERC20 Tokens',
    description: 'Configure which tokens are included in forks',
    isMultiAction: false,
    fields: [
      {
        name: 'tokens',
        label: 'Token Addresses (comma-separated)',
        type: 'text',
        placeholder: '0x..., 0x...',
        required: true,
        helpText: 'List of ERC20 token addresses to include'
      }
    ]
  },

  // Admin Functions - Admin & Governance
  'admin-pending-admin': {
    id: 'admin-pending-admin',
    category: 'admin',
    name: 'Set Pending Admin',
    description: 'Propose a new DAO admin. Uses safe two-step transfer pattern.',
    isMultiAction: false,
    fields: [
      {
        name: 'address',
        label: 'Pending Admin Address',
        type: 'address',
        placeholder: '0x...',
        required: true,
        helpText: 'New admin must call acceptAdmin() to complete transfer'
      }
    ]
  },

  // NOTE: Vetoer-related functions (_setVetoer, _setPendingVetoer, _burnVetoPower)
  // cannot be called via DAO proposal - they require direct call from current vetoer

  'admin-timelock-delay': {
    id: 'admin-timelock-delay',
    category: 'admin',
    name: 'Set Timelock Delay',
    description: 'Adjust timelock delay period',
    isMultiAction: false,
    fields: [
      {
        name: 'seconds',
        label: 'Delay (seconds)',
        type: 'number',
        placeholder: '172800',
        required: true,
        validation: { min: 0 },
        helpText: '2 days = 172800 seconds'
      }
    ]
  },

  'admin-timelock-admin': {
    id: 'admin-timelock-admin',
    category: 'admin',
    name: 'Set Timelock Pending Admin',
    description: 'Propose new timelock admin',
    isMultiAction: false,
    fields: [
      {
        name: 'address',
        label: 'Pending Admin Address',
        type: 'address',
        placeholder: '0x...',
        required: true
      }
    ]
  },

  // Meta Proposal - Create a proposal that creates another proposal
  'meta-propose': {
    id: 'meta-propose',
    category: 'meta',
    name: 'Create Proposal (Meta)',
    description: 'Create a proposal that, when executed, creates another proposal',
    isMultiAction: false,
    fields: [
      {
        name: 'innerTitle',
        label: 'Inner Proposal Title',
        type: 'text',
        placeholder: 'Title for the proposal that will be created',
        required: true,
        helpText: 'This will be the title of the NEW proposal created when this one executes'
      },
      {
        name: 'innerDescription',
        label: 'Inner Proposal Description',
        type: 'text',
        placeholder: 'Description for the inner proposal',
        required: true,
        helpText: 'Full description/body of the inner proposal'
      },
      // The inner action fields are handled specially by ActionTemplateEditor
      // to show a nested template picker instead of raw fields
      {
        name: 'innerAction',
        label: 'Inner Proposal Action',
        type: 'text',
        placeholder: '',
        required: true,
        helpText: 'The action the inner proposal will execute'
      }
    ]
  },

  // Custom Transaction
  'custom': {
    id: 'custom',
    category: 'custom',
    name: 'Custom Transaction',
    description: 'Manual entry for advanced users',
    isMultiAction: false,
    fields: []
  }
};

// Get templates by category
export function getTemplatesByCategory(category: ActionTemplate['category']): ActionTemplate[] {
  return Object.values(ACTION_TEMPLATES).filter(template => template.category === category);
}

// Get template by ID
export function getTemplate(id: ActionTemplateType): ActionTemplate | undefined {
  return ACTION_TEMPLATES[id];
}

// ============================================================================
// CALLDATA ENCODING HELPERS
// ============================================================================

function encodeSendETH(recipient: Address, amount: bigint): `0x${string}` {
  const recipientPadded = recipient.slice(2).padStart(64, '0');
  const amountHex = amount.toString(16).padStart(64, '0');
  return `0x${recipientPadded}${amountHex}`;
}

function encodeSendERC20(recipient: Address, token: Address, amount: bigint): `0x${string}` {
  const recipientPadded = recipient.slice(2).padStart(64, '0');
  const tokenPadded = token.slice(2).padStart(64, '0');
  const amountHex = amount.toString(16).padStart(64, '0');
  return `0x${recipientPadded}${tokenPadded}${amountHex}`;
}

function encodeTransferFrom(from: Address, to: Address, tokenIdOrAmount: bigint): `0x${string}` {
  const fromPadded = from.slice(2).padStart(64, '0');
  const toPadded = to.slice(2).padStart(64, '0');
  const valuePadded = tokenIdOrAmount.toString(16).padStart(64, '0');
  return `0x${fromPadded}${toPadded}${valuePadded}`;
}

function encodeSafeTransferFrom(from: Address, to: Address, tokenId: bigint): `0x${string}` {
  const fromPadded = from.slice(2).padStart(64, '0');
  const toPadded = to.slice(2).padStart(64, '0');
  const tokenIdPadded = tokenId.toString(16).padStart(64, '0');
  return `0x${fromPadded}${toPadded}${tokenIdPadded}`;
}

function encodeDelegate(delegatee: Address): `0x${string}` {
  const delegateePadded = delegatee.slice(2).padStart(64, '0');
  return `0x${delegateePadded}`;
}

function encodeTransfer(to: Address, amount: bigint): `0x${string}` {
  const toPadded = to.slice(2).padStart(64, '0');
  const amountPadded = amount.toString(16).padStart(64, '0');
  return `0x${toPadded}${amountPadded}`;
}

function encodeAdminUint256(value: bigint): `0x${string}` {
  const valuePadded = value.toString(16).padStart(64, '0');
  return `0x${valuePadded}`;
}

function encodeAdminUint32(value: number): `0x${string}` {
  const valuePadded = value.toString(16).padStart(64, '0');
  return `0x${valuePadded}`;
}

function encodeAdminUint16(value: number): `0x${string}` {
  const valuePadded = value.toString(16).padStart(64, '0');
  return `0x${valuePadded}`;
}

function encodeAdminAddress(address: Address): `0x${string}` {
  const addressPadded = address.slice(2).padStart(64, '0');
  return `0x${addressPadded}`;
}

function encodeDynamicQuorumParams(minBps: number, maxBps: number, coefficient: number): `0x${string}` {
  const minBpsPadded = minBps.toString(16).padStart(64, '0');
  const maxBpsPadded = maxBps.toString(16).padStart(64, '0');
  const coefficientPadded = coefficient.toString(16).padStart(64, '0');
  return `0x${minBpsPadded}${maxBpsPadded}${coefficientPadded}`;
}

function encodeBurnVetoPower(): `0x${string}` {
  return '0x';
}

function encodeCreateStreamWithPredictedAddress(
  recipient: Address,
  tokenAmount: bigint,
  tokenAddress: Address,
  startTime: bigint,
  stopTime: bigint,
  nonce: number,
  predictedStreamAddress: Address
): `0x${string}` {
  const recipientPadded = recipient.slice(2).padStart(64, '0');
  const tokenAmountHex = tokenAmount.toString(16).padStart(64, '0');
  const tokenAddressPadded = tokenAddress.slice(2).padStart(64, '0');
  const startTimeHex = startTime.toString(16).padStart(64, '0');
  const stopTimeHex = stopTime.toString(16).padStart(64, '0');
  const noncePadded = nonce.toString(16).padStart(64, '0');
  const predictedAddressPadded = predictedStreamAddress.slice(2).padStart(64, '0');
  
  return `0x${recipientPadded}${tokenAmountHex}${tokenAddressPadded}${startTimeHex}${stopTimeHex}${noncePadded}${predictedAddressPadded}`;
}

/**
 * Encode the calldata for a meta-proposal (propose() that creates another proposal)
 * This uses viem's encodeAbiParameters for complex nested array encoding
 */
function encodeMetaProposeCalldata(
  targets: Address[],
  values: bigint[],
  signatures: string[],
  calldatas: `0x${string}`[],
  description: string,
  clientId: number
): `0x${string}` {
  // Use viem to properly encode the complex nested structure
  const encoded = encodeAbiParameters(
    parseAbiParameters('address[], uint256[], string[], bytes[], string, uint32'),
    [targets, values, signatures, calldatas, description, clientId]
  );
  return encoded;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export function parseEther(amount: string): bigint {
  const trimmed = amount.trim();
  if (!trimmed || trimmed === '0') return BigInt(0);
  
  const [whole, decimal = ''] = trimmed.split('.');
  const paddedDecimal = decimal.padEnd(18, '0').slice(0, 18);
  
  return BigInt(whole + paddedDecimal);
}

export function parseUnits(amount: string, decimals: number): bigint {
  const trimmed = amount.trim();
  if (!trimmed || trimmed === '0') return BigInt(0);
  
  const [whole, decimal = ''] = trimmed.split('.');
  const paddedDecimal = decimal.padEnd(decimals, '0').slice(0, decimals);
  
  return BigInt(whole + paddedDecimal);
}

export function formatUnits(value: bigint, decimals: number): string {
  const str = value.toString().padStart(decimals + 1, '0');
  const whole = str.slice(0, -decimals) || '0';
  const decimal = str.slice(-decimals).replace(/0+$/, '');
  
  return decimal ? `${whole}.${decimal}` : whole;
}

// ============================================================================
// ACTION GENERATION FUNCTIONS
// ============================================================================

export function generateActionsFromTemplate(
  templateId: ActionTemplateType,
  fieldValues: TemplateFieldValues
): ProposalAction[] {
  const template = getTemplate(templateId);
  if (!template) {
    throw new Error(`Template not found: ${templateId}`);
  }

  switch (templateId) {
    // Treasury Transfers
    case 'treasury-eth':
      return [{
        target: TREASURY_ADDRESS,
        value: '0',
        signature: 'sendETH(address,uint256)',
        calldata: encodeSendETH(
          fieldValues.recipient as Address,
          parseEther(fieldValues.amount || '0')
        )
      }];

    case 'treasury-usdc':
      // Call transfer() directly on USDC contract - treasury is the caller
      return [{
        target: EXTERNAL_CONTRACTS.USDC.address,
        value: '0',
        signature: 'transfer(address,uint256)',
        calldata: encodeTransfer(
          fieldValues.recipient as Address,
          parseUnits(fieldValues.amount || '0', 6)
        )
      }];

    case 'treasury-weth':
      // Call transfer() directly on WETH contract - treasury is the caller
      return [{
        target: EXTERNAL_CONTRACTS.WETH.address,
        value: '0',
        signature: 'transfer(address,uint256)',
        calldata: encodeTransfer(
          fieldValues.recipient as Address,
          parseEther(fieldValues.amount || '0')
        )
      }];

    case 'treasury-erc20-custom': {
      const parsed = JSON.parse(fieldValues.token || '{}');
      const tokenInfo: TokenInfo = {
        symbol: parsed.symbol,
        address: parsed.address,
        decimals: parsed.decimals,
        balance: parsed.balance ? BigInt(parsed.balance) : undefined
      };
      // Call transfer() directly on token contract - treasury is the caller
      return [{
        target: tokenInfo.address,
        value: '0',
        signature: 'transfer(address,uint256)',
        calldata: encodeTransfer(
          fieldValues.recipient as Address,
          parseUnits(fieldValues.amount || '0', tokenInfo.decimals)
        )
      }];
    }

    // Treasury Swaps via TokenBuyer
    case 'swap-buy-eth': {
      // TokenBuyer contract buys ETH from market using USDC
      const TOKEN_BUYER_ADDRESS = '0x4f2aCdc74f6941390d9b1804faBc3E780388cfe5' as Address;
      const ethAmount = parseEther(fieldValues.ethAmount || '0');
      return [{
        target: TOKEN_BUYER_ADDRESS,
        value: '0',
        signature: 'buyETH(uint256)',
        calldata: encodeAdminUint256(ethAmount)
      }];
    }

    case 'swap-sell-eth': {
      // Payer contract can sell ETH for USDC
      const PAYER_ADDRESS = '0xd97Bcd9f47cEe35c0a9ec1dc40C1269afc9E8E1D' as Address;
      const ethAmount = parseEther(fieldValues.ethAmount || '0');
      return [{
        target: PAYER_ADDRESS,
        value: ethAmount.toString(),
        signature: 'payBackDebt(uint256)',
        calldata: encodeAdminUint256(ethAmount)
      }];
    }

    // Nouns Operations
    case 'noun-transfer':
      return [{
        target: NOUNS_TOKEN_ADDRESS,
        value: '0',
        signature: 'safeTransferFrom(address,address,uint256)',
        calldata: encodeSafeTransferFrom(
          TREASURY_ADDRESS,
          fieldValues.recipient as Address,
          BigInt(fieldValues.nounId || '0')
        )
      }];

    case 'noun-swap': {
      const actions: ProposalAction[] = [];
      const groupId = `noun-swap-${Date.now()}`;
      
      // Action 1: User's Noun → Treasury
      actions.push({
        target: NOUNS_TOKEN_ADDRESS,
        value: '0',
        signature: 'transferFrom(address,address,uint256)',
        calldata: encodeTransferFrom(
          fieldValues.userAddress as Address,
          TREASURY_ADDRESS,
          BigInt(fieldValues.userNounId || '0')
        ),
        isPartOfMultiAction: true,
        multiActionGroupId: groupId,
        multiActionIndex: 0
      });
      
      // Action 2: Optional Tip → Treasury
      if (fieldValues.tipAmount && parseFloat(fieldValues.tipAmount) > 0) {
        const tipCurrency = fieldValues.tipCurrency || 'weth';
        
        if (tipCurrency === 'eth') {
          actions.push({
            target: TREASURY_ADDRESS,
            value: parseEther(fieldValues.tipAmount).toString(),
            signature: '',
            calldata: '0x',
            isPartOfMultiAction: true,
            multiActionGroupId: groupId,
            multiActionIndex: actions.length
          });
        } else if (tipCurrency === 'weth') {
          actions.push({
            target: EXTERNAL_CONTRACTS.WETH.address,
            value: '0',
            signature: 'transferFrom(address,address,uint256)',
            calldata: encodeTransferFrom(
              fieldValues.userAddress as Address,
              TREASURY_ADDRESS,
              parseEther(fieldValues.tipAmount)
            ),
            isPartOfMultiAction: true,
            multiActionGroupId: groupId,
            multiActionIndex: actions.length
          });
        } else if (tipCurrency === 'usdc') {
          actions.push({
            target: EXTERNAL_CONTRACTS.USDC.address,
            value: '0',
            signature: 'transferFrom(address,address,uint256)',
            calldata: encodeTransferFrom(
              fieldValues.userAddress as Address,
              TREASURY_ADDRESS,
              parseUnits(fieldValues.tipAmount, 6)
            ),
            isPartOfMultiAction: true,
            multiActionGroupId: groupId,
            multiActionIndex: actions.length
          });
        }
      }
      
      // Action 3: Treasury's Noun → User
      actions.push({
        target: NOUNS_TOKEN_ADDRESS,
        value: '0',
        signature: 'safeTransferFrom(address,address,uint256)',
        calldata: encodeSafeTransferFrom(
          TREASURY_ADDRESS,
          fieldValues.userAddress as Address,
          BigInt(fieldValues.treasuryNounId || '0')
        ),
        isPartOfMultiAction: true,
        multiActionGroupId: groupId,
        multiActionIndex: actions.length
      });
      
      return actions;
    }

    case 'noun-delegate':
      return [{
        target: NOUNS_TOKEN_ADDRESS,
        value: '0',
        signature: 'delegate(address)',
        calldata: encodeDelegate(fieldValues.delegatee as Address)
      }];

    case 'auction-bid': {
      const bidAmountWei = parseUnits(fieldValues.bidAmount || '0', 18);
      return [{
        target: NOUNS_ADDRESSES.auctionHouse,
        value: bidAmountWei.toString(),
        signature: 'createBid(uint256,uint32)',
        calldata: encodeAbiParameters(
          parseAbiParameters('uint256, uint32'),
          [BigInt(fieldValues.nounId || '0'), BERRY_CLIENT_ID]
        )
      }];
    }

    // Payment Streams
    case 'payment-stream': {
      const actions: ProposalAction[] = [];
      const groupId = `payment-stream-${Date.now()}`;

      const startTimestamp = fieldValues.startDate 
        ? BigInt(Math.floor(new Date(fieldValues.startDate).getTime() / 1000))
        : BigInt(0);
      const endTimestamp = fieldValues.endDate
        ? BigInt(Math.floor(new Date(fieldValues.endDate).getTime() / 1000))
        : BigInt(0);

      const tokenAddress = fieldValues.tokenAddress as Address;
      const token = COMMON_TOKENS.find(t => t.address.toLowerCase() === tokenAddress.toLowerCase());
      const decimals = token?.decimals || 18;
      const tokenAmount = parseUnits(fieldValues.amount || '0', decimals);

      const predictedStreamAddress = fieldValues.streamAddress as Address;
      
      // Action 1: Create the stream
      actions.push({
        target: STREAM_FACTORY_ADDRESS,
        value: '0',
        signature: 'createStream(address,uint256,address,uint256,uint256,uint8,address)',
        calldata: encodeCreateStreamWithPredictedAddress(
          fieldValues.recipient as Address,
          tokenAmount,
          tokenAddress,
          startTimestamp,
          endTimestamp,
          0,
          predictedStreamAddress
        ),
        isPartOfMultiAction: true,
        multiActionGroupId: groupId,
        multiActionIndex: 0
      });

      // Action 2: Fund the stream
      actions.push({
        target: tokenAddress,
        value: '0',
        signature: 'transfer(address,uint256)',
        calldata: encodeTransfer(
          predictedStreamAddress,
          tokenAmount
        ),
        isPartOfMultiAction: true,
        multiActionGroupId: groupId,
        multiActionIndex: 1
      });

      return actions;
    }

    // One-time Payment via Payer
    case 'payment-once': {
      const PAYER_ADDRESS = '0xd97Bcd9f47cEe35c0a9ec1dc40C1269afc9E8E1D' as Address;
      const amount = parseUnits(fieldValues.amount || '0', 6); // USDC has 6 decimals
      return [{
        target: PAYER_ADDRESS,
        value: '0',
        signature: 'sendOrRegisterDebt(address,uint256)',
        calldata: encodeSendETH(fieldValues.recipient as Address, amount) // Same encoding format
      }];
    }

    // Admin Functions - Voting
    case 'admin-voting-delay':
      return [{
        target: DAO_PROXY_ADDRESS,
        value: '0',
        signature: '_setVotingDelay(uint256)',
        calldata: encodeAdminUint256(BigInt(fieldValues.blocks || '0'))
      }];

    case 'admin-voting-period':
      return [{
        target: DAO_PROXY_ADDRESS,
        value: '0',
        signature: '_setVotingPeriod(uint256)',
        calldata: encodeAdminUint256(BigInt(fieldValues.blocks || '0'))
      }];

    case 'admin-proposal-threshold':
      return [{
        target: DAO_PROXY_ADDRESS,
        value: '0',
        signature: '_setProposalThresholdBPS(uint256)',
        calldata: encodeAdminUint256(BigInt(fieldValues.bps || '0'))
      }];

    case 'admin-last-minute-window':
      return [{
        target: DAO_PROXY_ADDRESS,
        value: '0',
        signature: '_setLastMinuteWindowInBlocks(uint32)',
        calldata: encodeAdminUint32(Number(fieldValues.blocks || '0'))
      }];

    case 'admin-objection-period':
      return [{
        target: DAO_PROXY_ADDRESS,
        value: '0',
        signature: '_setObjectionPeriodDurationInBlocks(uint32)',
        calldata: encodeAdminUint32(Number(fieldValues.blocks || '0'))
      }];

    case 'admin-updatable-period':
      return [{
        target: DAO_PROXY_ADDRESS,
        value: '0',
        signature: '_setProposalUpdatablePeriodInBlocks(uint32)',
        calldata: encodeAdminUint32(Number(fieldValues.blocks || '0'))
      }];

    // Admin Functions - Quorum
    case 'admin-min-quorum':
      return [{
        target: DAO_PROXY_ADDRESS,
        value: '0',
        signature: '_setMinQuorumVotesBPS(uint16)',
        calldata: encodeAdminUint16(Number(fieldValues.bps || '0'))
      }];

    case 'admin-max-quorum':
      return [{
        target: DAO_PROXY_ADDRESS,
        value: '0',
        signature: '_setMaxQuorumVotesBPS(uint16)',
        calldata: encodeAdminUint16(Number(fieldValues.bps || '0'))
      }];

    case 'admin-quorum-coefficient':
      return [{
        target: DAO_PROXY_ADDRESS,
        value: '0',
        signature: '_setQuorumCoefficient(uint32)',
        calldata: encodeAdminUint32(Number(fieldValues.coefficient || '0'))
      }];

    case 'admin-dynamic-quorum':
      return [{
        target: DAO_PROXY_ADDRESS,
        value: '0',
        signature: '_setDynamicQuorumParams(uint16,uint16,uint32)',
        calldata: encodeDynamicQuorumParams(
          Number(fieldValues.minBps || '0'),
          Number(fieldValues.maxBps || '0'),
          Number(fieldValues.coefficient || '0')
        )
      }];

    // Admin Functions - Fork
    case 'admin-fork-period':
      return [{
        target: DAO_PROXY_ADDRESS,
        value: '0',
        signature: '_setForkPeriod(uint256)',
        calldata: encodeAdminUint256(BigInt(fieldValues.seconds || '0'))
      }];

    case 'admin-fork-threshold':
      return [{
        target: DAO_PROXY_ADDRESS,
        value: '0',
        signature: '_setForkThresholdBPS(uint256)',
        calldata: encodeAdminUint256(BigInt(fieldValues.bps || '0'))
      }];

    case 'admin-fork-deployer':
      return [{
        target: DAO_PROXY_ADDRESS,
        value: '0',
        signature: '_setForkDAODeployer(address)',
        calldata: encodeAdminAddress(fieldValues.address as Address)
      }];

    case 'admin-fork-escrow':
      return [{
        target: DAO_PROXY_ADDRESS,
        value: '0',
        signature: '_setForkEscrow(address)',
        calldata: encodeAdminAddress(fieldValues.address as Address)
      }];

    case 'admin-fork-tokens': {
      // Parse comma-separated token addresses
      const tokenAddresses = (fieldValues.tokens || '')
        .split(',')
        .map(addr => addr.trim())
        .filter(addr => addr.length === 42 && addr.startsWith('0x'));
      
      // Encode array of addresses for _setErc20TokensToIncludeInFork(address[])
      // ABI encoding for dynamic array:
      // - offset to array data (32 bytes)
      // - array length (32 bytes)
      // - array elements (32 bytes each, left-padded)
      const offsetHex = (32).toString(16).padStart(64, '0'); // offset is 32 (0x20)
      const lengthHex = tokenAddresses.length.toString(16).padStart(64, '0');
      const elementsHex = tokenAddresses
        .map(addr => addr.slice(2).padStart(64, '0'))
        .join('');
      
      return [{
        target: DAO_PROXY_ADDRESS,
        value: '0',
        signature: '_setErc20TokensToIncludeInFork(address[])',
        calldata: `0x${offsetHex}${lengthHex}${elementsHex}` as `0x${string}`
      }];
    }

    // Admin Functions - Admin
    case 'admin-pending-admin':
      return [{
        target: DAO_PROXY_ADDRESS,
        value: '0',
        signature: '_setPendingAdmin(address)',
        calldata: encodeAdminAddress(fieldValues.address as Address)
      }];

    case 'admin-timelock-delay':
      return [{
        target: TREASURY_ADDRESS,
        value: '0',
        signature: '_setDelay(uint256)',
        calldata: encodeAdminUint256(BigInt(fieldValues.seconds || '0'))
      }];

    case 'admin-timelock-admin':
      return [{
        target: TREASURY_ADDRESS,
        value: '0',
        signature: '_setPendingAdmin(address)',
        calldata: encodeAdminAddress(fieldValues.address as Address)
      }];

    case 'meta-propose': {
      // Create a proposal that creates another proposal when executed
      // This calls propose() on the DAO Governor with the inner proposal parameters
      const innerTitle = fieldValues.innerTitle || '';
      const innerDescription = fieldValues.innerDescription || '';
      const innerFullDescription = `# ${innerTitle}\n\n${innerDescription}`;
      
      // Parse the inner action from JSON (stored by nested template editor)
      let innerActions: ProposalAction[] = [];
      try {
        if (fieldValues.innerAction) {
          innerActions = JSON.parse(fieldValues.innerAction);
        }
      } catch {
        // If parsing fails, use empty action
        innerActions = [{ target: '', value: '0', signature: '', calldata: '0x' }];
      }
      
      // Extract arrays from inner actions
      const innerTargets = innerActions.map(a => (a.target || '0x0000000000000000000000000000000000000000') as Address);
      const innerValues = innerActions.map(a => BigInt(a.value || '0'));
      const innerSignatures = innerActions.map(a => a.signature || '');
      const innerCalldatas = innerActions.map(a => (a.calldata || '0x') as `0x${string}`);
      
      // Encode the propose() call with nested arrays
      // propose(address[],uint256[],string[],bytes[],string,uint32)
      const calldata = encodeMetaProposeCalldata(
        innerTargets,
        innerValues,
        innerSignatures,
        innerCalldatas,
        innerFullDescription,
        BERRY_CLIENT_ID
      );
      
      return [{
        target: DAO_PROXY_ADDRESS,
        value: '0',
        signature: 'propose(address[],uint256[],string[],bytes[],string,uint32)',
        calldata
      }];
    }

    case 'custom':
      return [{
        target: fieldValues.target as string || '',
        value: fieldValues.value as string || '0',
        signature: fieldValues.signature as string || '',
        calldata: fieldValues.calldata as string || '0x'
      }];

    default:
      throw new Error(`Template not implemented: ${templateId}`);
  }
}

// ============================================================================
// ACTION PARSING - Reverse engineer actions back to templates
// ============================================================================

/**
 * Parse a proposal action back to its template form
 * Attempts to match the action to a known template and extract field values
 */
export function parseActionToTemplate(action: ProposalAction): ActionTemplateState {
  const target = action.target.toLowerCase();
  const signature = action.signature;
  const calldata = action.calldata || '0x';
  const value = action.value;

  // Try to match the action to a known template
  const matched = matchActionToTemplate(target, signature, calldata, value);
  
  if (matched) {
    return matched;
  }
  
  // Default to custom template
  return {
    templateId: 'custom',
    fieldValues: {
      target: action.target,
      value: action.value,
      signature: action.signature,
      calldata: action.calldata
    },
    generatedActions: [action]
  };
}

/**
 * Parse multiple actions to template states
 * Handles multi-action templates by grouping related actions
 */
export function parseActionsToTemplates(actions: ProposalAction[]): ActionTemplateState[] {
  if (!actions || actions.length === 0) {
    return [];
  }
  
  const templateStates: ActionTemplateState[] = [];
  const processedIndices = new Set<number>();
  
  for (let i = 0; i < actions.length; i++) {
    if (processedIndices.has(i)) continue;
    
    const action = actions[i];
    
    // Check if this is part of a noun-swap multi-action sequence
    const nounSwapResult = tryMatchNounSwap(actions, i);
    if (nounSwapResult) {
      templateStates.push(nounSwapResult.state);
      nounSwapResult.consumedIndices.forEach(idx => processedIndices.add(idx));
      continue;
    }
    
    // Single action match
    processedIndices.add(i);
    templateStates.push(parseActionToTemplate(action));
  }
  
  return templateStates;
}

/**
 * Try to match a single action to a template
 */
function matchActionToTemplate(
  target: string,
  signature: string,
  calldata: string,
  value: string
): ActionTemplateState | null {
  
  // Treasury ETH transfer
  if (target === TREASURY_ADDRESS.toLowerCase() && signature === 'sendETH(address,uint256)') {
    const decoded = decodeCalldata(calldata, ['address', 'uint256']);
    if (decoded) {
      return {
        templateId: 'treasury-eth',
        fieldValues: {
          recipient: decoded[0] as string,
          amount: formatUnits(BigInt(decoded[1] as string), 18)
        },
        generatedActions: []
      };
    }
  }
  
  // USDC transfer (directly on USDC contract)
  if (target === EXTERNAL_CONTRACTS.USDC.address.toLowerCase() && signature === 'transfer(address,uint256)') {
    const decoded = decodeCalldata(calldata, ['address', 'uint256']);
    if (decoded) {
      return {
        templateId: 'treasury-usdc',
        fieldValues: {
          recipient: decoded[0] as string,
          amount: formatUnits(BigInt(decoded[1] as string), 6)
        },
        generatedActions: []
      };
    }
  }
  
  // WETH transfer (directly on WETH contract)
  if (target === EXTERNAL_CONTRACTS.WETH.address.toLowerCase() && signature === 'transfer(address,uint256)') {
    const decoded = decodeCalldata(calldata, ['address', 'uint256']);
    if (decoded) {
      return {
        templateId: 'treasury-weth',
        fieldValues: {
          recipient: decoded[0] as string,
          amount: formatUnits(BigInt(decoded[1] as string), 18)
        },
        generatedActions: []
      };
    }
  }
  
  // Noun transfer from treasury
  if (target === NOUNS_TOKEN_ADDRESS.toLowerCase() && signature === 'safeTransferFrom(address,address,uint256)') {
    const decoded = decodeCalldata(calldata, ['address', 'address', 'uint256']);
    if (decoded) {
      const from = (decoded[0] as string).toLowerCase();
      const to = decoded[1] as string;
      const nounId = decoded[2] as string;
      
      // Check if it's a treasury → user transfer
      if (from === TREASURY_ADDRESS.toLowerCase()) {
        return {
          templateId: 'noun-transfer',
          fieldValues: {
            recipient: to,
            nounId: nounId
          },
          generatedActions: []
        };
      }
    }
  }
  
  // Delegate
  if (target === NOUNS_TOKEN_ADDRESS.toLowerCase() && signature === 'delegate(address)') {
    const decoded = decodeCalldata(calldata, ['address']);
    if (decoded) {
      return {
        templateId: 'noun-delegate',
        fieldValues: {
          delegatee: decoded[0] as string
        },
        generatedActions: []
      };
    }
  }
  
  // Auction Bid
  const AUCTION_HOUSE_ADDRESS = NOUNS_ADDRESSES.auctionHouse.toLowerCase();
  if (target === AUCTION_HOUSE_ADDRESS && signature === 'createBid(uint256,uint32)') {
    const decoded = decodeCalldata(calldata, ['uint256', 'uint32']);
    if (decoded) {
      return {
        templateId: 'auction-bid',
        fieldValues: {
          nounId: decoded[0] as string,
          bidAmount: formatUnits(BigInt(value), 18)
        },
        generatedActions: []
      };
    }
  }
  
  // Buy ETH (TokenBuyer)
  const TOKEN_BUYER_ADDRESS = '0x4f2aCdc74f6941390d9b1804faBc3E780388cfe5'.toLowerCase();
  if (target === TOKEN_BUYER_ADDRESS && signature === 'buyETH(uint256)') {
    const decoded = decodeCalldata(calldata, ['uint256']);
    if (decoded) {
      return {
        templateId: 'swap-buy-eth',
        fieldValues: {
          ethAmount: formatUnits(BigInt(decoded[0] as string), 18)
        },
        generatedActions: []
      };
    }
  }
  
  // Admin functions on DAO Proxy
  if (target === DAO_PROXY_ADDRESS.toLowerCase()) {
    const adminMatch = matchAdminAction(signature, calldata);
    if (adminMatch) {
      return adminMatch;
    }
  }
  
  return null;
}

/**
 * Try to match a noun-swap multi-action sequence
 */
function tryMatchNounSwap(
  actions: ProposalAction[],
  startIndex: number
): { state: ActionTemplateState; consumedIndices: number[] } | null {
  const action = actions[startIndex];
  const target = action.target.toLowerCase();
  const signature = action.signature;
  
  // Noun swap starts with transferFrom (user's noun to treasury)
  if (target === NOUNS_TOKEN_ADDRESS.toLowerCase() && signature === 'transferFrom(address,address,uint256)') {
    const decoded = decodeCalldata(action.calldata || '0x', ['address', 'address', 'uint256']);
    if (!decoded) return null;
    
    const userAddress = decoded[0] as string;
    const toAddress = (decoded[1] as string).toLowerCase();
    const userNounId = decoded[2] as string;
    
    // Must transfer to treasury
    if (toAddress !== TREASURY_ADDRESS.toLowerCase()) return null;
    
    // Look for the corresponding safeTransferFrom (treasury's noun to user)
    const consumedIndices = [startIndex];
    let tipCurrency: string | undefined;
    let tipAmount: string | undefined;
    let treasuryNounId: string | undefined;
    
    for (let i = startIndex + 1; i < actions.length; i++) {
      const nextAction = actions[i];
      const nextTarget = nextAction.target.toLowerCase();
      const nextSig = nextAction.signature;
      
      // Check for tip transfer (WETH/USDC transferFrom or ETH value)
      if (nextSig === 'transferFrom(address,address,uint256)') {
        if (nextTarget === EXTERNAL_CONTRACTS.WETH.address.toLowerCase()) {
          const tipDecoded = decodeCalldata(nextAction.calldata || '0x', ['address', 'address', 'uint256']);
          if (tipDecoded) {
            tipCurrency = 'weth';
            tipAmount = formatUnits(BigInt(tipDecoded[2] as string), 18);
            consumedIndices.push(i);
          }
        } else if (nextTarget === EXTERNAL_CONTRACTS.USDC.address.toLowerCase()) {
          const tipDecoded = decodeCalldata(nextAction.calldata || '0x', ['address', 'address', 'uint256']);
          if (tipDecoded) {
            tipCurrency = 'usdc';
            tipAmount = formatUnits(BigInt(tipDecoded[2] as string), 6);
            consumedIndices.push(i);
          }
        }
      }
      
      // Check for treasury → user noun transfer
      if (nextTarget === NOUNS_TOKEN_ADDRESS.toLowerCase() && nextSig === 'safeTransferFrom(address,address,uint256)') {
        const transferDecoded = decodeCalldata(nextAction.calldata || '0x', ['address', 'address', 'uint256']);
        if (transferDecoded) {
          const fromAddr = (transferDecoded[0] as string).toLowerCase();
          const toAddr = (transferDecoded[1] as string).toLowerCase();
          
          if (fromAddr === TREASURY_ADDRESS.toLowerCase() && toAddr === userAddress.toLowerCase()) {
            treasuryNounId = transferDecoded[2] as string;
            consumedIndices.push(i);
            
            // We found all parts of the noun swap
            return {
              state: {
                templateId: 'noun-swap',
                fieldValues: {
                  userAddress: userAddress,
                  userNounId: userNounId,
                  treasuryNounId: treasuryNounId,
                  tipCurrency: tipCurrency,
                  tipAmount: tipAmount
                },
                generatedActions: consumedIndices.map(idx => actions[idx])
              },
              consumedIndices
            };
          }
        }
      }
    }
  }
  
  return null;
}

/**
 * Match admin function signatures
 */
function matchAdminAction(signature: string, calldata: string): ActionTemplateState | null {
  // Voting parameters
  if (signature === '_setVotingDelay(uint256)') {
    const decoded = decodeCalldata(calldata, ['uint256']);
    if (decoded) {
      return {
        templateId: 'admin-voting-delay',
        fieldValues: { blocks: decoded[0] as string },
        generatedActions: []
      };
    }
  }
  
  if (signature === '_setVotingPeriod(uint256)') {
    const decoded = decodeCalldata(calldata, ['uint256']);
    if (decoded) {
      return {
        templateId: 'admin-voting-period',
        fieldValues: { blocks: decoded[0] as string },
        generatedActions: []
      };
    }
  }
  
  if (signature === '_setProposalThresholdBPS(uint256)') {
    const decoded = decodeCalldata(calldata, ['uint256']);
    if (decoded) {
      return {
        templateId: 'admin-proposal-threshold',
        fieldValues: { bps: decoded[0] as string },
        generatedActions: []
      };
    }
  }
  
  if (signature === '_setLastMinuteWindowInBlocks(uint256)') {
    const decoded = decodeCalldata(calldata, ['uint256']);
    if (decoded) {
      return {
        templateId: 'admin-last-minute-window',
        fieldValues: { blocks: decoded[0] as string },
        generatedActions: []
      };
    }
  }
  
  if (signature === '_setObjectionPeriodDurationInBlocks(uint256)') {
    const decoded = decodeCalldata(calldata, ['uint256']);
    if (decoded) {
      return {
        templateId: 'admin-objection-period',
        fieldValues: { blocks: decoded[0] as string },
        generatedActions: []
      };
    }
  }
  
  if (signature === '_setProposalUpdatablePeriodInBlocks(uint256)') {
    const decoded = decodeCalldata(calldata, ['uint256']);
    if (decoded) {
      return {
        templateId: 'admin-updatable-period',
        fieldValues: { blocks: decoded[0] as string },
        generatedActions: []
      };
    }
  }
  
  // Quorum parameters
  if (signature === '_setMinQuorumVotesBPS(uint16)') {
    const decoded = decodeCalldata(calldata, ['uint16']);
    if (decoded) {
      return {
        templateId: 'admin-min-quorum',
        fieldValues: { bps: decoded[0] as string },
        generatedActions: []
      };
    }
  }
  
  if (signature === '_setMaxQuorumVotesBPS(uint16)') {
    const decoded = decodeCalldata(calldata, ['uint16']);
    if (decoded) {
      return {
        templateId: 'admin-max-quorum',
        fieldValues: { bps: decoded[0] as string },
        generatedActions: []
      };
    }
  }
  
  if (signature === '_setQuorumCoefficient(uint32)') {
    const decoded = decodeCalldata(calldata, ['uint32']);
    if (decoded) {
      return {
        templateId: 'admin-quorum-coefficient',
        fieldValues: { coefficient: decoded[0] as string },
        generatedActions: []
      };
    }
  }
  
  // Fork parameters
  if (signature === '_setForkPeriod(uint256)') {
    const decoded = decodeCalldata(calldata, ['uint256']);
    if (decoded) {
      return {
        templateId: 'admin-fork-period',
        fieldValues: { seconds: decoded[0] as string },
        generatedActions: []
      };
    }
  }
  
  if (signature === '_setForkThresholdBPS(uint256)') {
    const decoded = decodeCalldata(calldata, ['uint256']);
    if (decoded) {
      return {
        templateId: 'admin-fork-threshold',
        fieldValues: { bps: decoded[0] as string },
        generatedActions: []
      };
    }
  }
  
  if (signature === '_setForkDAODeployer(address)') {
    const decoded = decodeCalldata(calldata, ['address']);
    if (decoded) {
      return {
        templateId: 'admin-fork-deployer',
        fieldValues: { address: decoded[0] as string },
        generatedActions: []
      };
    }
  }
  
  if (signature === '_setForkEscrow(address)') {
    const decoded = decodeCalldata(calldata, ['address']);
    if (decoded) {
      return {
        templateId: 'admin-fork-escrow',
        fieldValues: { address: decoded[0] as string },
        generatedActions: []
      };
    }
  }
  
  if (signature === '_setPendingAdmin(address)') {
    const decoded = decodeCalldata(calldata, ['address']);
    if (decoded) {
      return {
        templateId: 'admin-pending-admin',
        fieldValues: { address: decoded[0] as string },
        generatedActions: []
      };
    }
  }
  
  return null;
}

/**
 * Decode calldata based on expected types
 * Returns array of decoded values or null if decoding fails
 */
function decodeCalldata(calldata: string, types: string[]): (string | bigint)[] | null {
  try {
    // Remove 0x prefix if present
    let data = calldata.startsWith('0x') ? calldata.slice(2) : calldata;
    
    if (!data || data === '') return null;
    
    const results: (string | bigint)[] = [];
    let offset = 0;
    
    for (const type of types) {
      if (offset >= data.length) return null;
      
      if (type === 'address') {
        // Address is 32 bytes (64 hex chars), padded to left
        const chunk = data.slice(offset, offset + 64);
        if (chunk.length < 64) return null;
        // Extract address from the last 40 characters
        const address = '0x' + chunk.slice(-40);
        results.push(address);
        offset += 64;
      } else if (type === 'uint256' || type === 'uint96' || type === 'uint32' || type === 'uint16') {
        // uint is 32 bytes (64 hex chars)
        const chunk = data.slice(offset, offset + 64);
        if (chunk.length < 64) return null;
        const value = BigInt('0x' + chunk);
        results.push(value.toString());
        offset += 64;
      }
    }
    
    return results;
  } catch (e) {
    return null;
  }
}
