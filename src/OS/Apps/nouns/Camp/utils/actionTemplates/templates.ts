/**
 * ACTION TEMPLATES REGISTRY
 * Definitions for all action template types and getter functions
 */

import { ActionTemplate, ActionTemplateType } from './types';

export const ACTION_TEMPLATES: Record<ActionTemplateType, ActionTemplate> = {
  // Treasury Transfer — unified ETH + ERC-20 send picker.
  'treasury-transfer': {
    id: 'treasury-transfer',
    category: 'payments',
    name: 'Pay via Treasury',
    description: 'Send ETH or any ERC-20 token directly from the treasury to a recipient',
    isMultiAction: false,
    fields: [
      {
        name: 'token',
        label: 'Token',
        type: 'treasury-token-select',
        required: true,
        helpText: 'Pick from treasury holdings'
      },
      {
        name: 'recipient',
        label: 'Recipient',
        type: 'address',
        placeholder: '0x... or name.eth',
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

  // Delegate the voting power of any ERC20Votes token the treasury holds
  // (ENS, COMP, UNI, ARB, etc). One transaction: target = token contract,
  // signature = delegate(address). Reversible by a later proposal.
  'treasury-delegate': {
    id: 'treasury-delegate',
    category: 'delegation',
    name: 'Delegate Voting Power',
    description: 'Delegate the voting power of an ERC20Votes token held by the treasury (e.g. ENS, COMP, UNI)',
    isMultiAction: false,
    fields: [
      {
        name: 'token',
        label: 'Token',
        type: 'treasury-votes-token-select',
        required: true,
        helpText: 'Only ERC20Votes-compatible holdings (ENS, COMP, UNI, ARB) are shown.'
      },
      {
        name: 'delegatee',
        label: 'Delegate To',
        type: 'address',
        placeholder: '0x... or name.eth',
        required: true,
        helpText: 'Address that will receive the treasury’s voting power for this token'
      }
    ]
  },

  // Treasury Swaps
  'swap-buy-eth': {
    id: 'swap-buy-eth',
    category: 'swaps',
    name: 'Buy ETH with USDC',
    description: 'Use TokenBuyer to swap treasury USDC for ETH',
    isMultiAction: true,
    fields: [
      {
        name: 'usdcAmount',
        label: 'USDC Amount to Spend',
        type: 'amount',
        placeholder: '0.0',
        required: true,
        validation: { min: 0, decimals: 6 },
        helpText: 'Amount of USDC to spend — the TokenBuyer converts it to ETH at its current price'
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
    category: 'delegation',
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

  // Payment Streams
  'payment-stream': {
    id: 'payment-stream',
    category: 'streams',
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
        type: 'predicted-stream-address',
        required: true,
      }
    ]
  },

  'stream-cancel': {
    id: 'stream-cancel',
    category: 'streams',
    name: 'Cancel Payment Stream',
    description: 'Cancel a stream and return the unvested remainder to the treasury (recipient keeps vested funds)',
    isMultiAction: true,
    fields: [
      {
        name: 'streamAddress',
        label: 'Stream',
        type: 'stream-select',
        required: true,
        helpText: 'Active treasury streams. Recipient keeps what has vested; the unvested remainder is returned to the treasury.'
      }
    ]
  },

  'stream-redirect': {
    id: 'stream-redirect',
    category: 'streams',
    name: 'Redirect Payment Stream',
    description: 'Cancel a stream and send the unvested remainder as a single lump-sum payment to a different address',
    isMultiAction: true,
    fields: [
      {
        name: 'streamAddress',
        label: 'Stream',
        type: 'stream-select',
        required: true,
        helpText: 'Recipient keeps what has vested; the unvested remainder is sent to the destination below as a one-time lump sum (not a new stream).'
      },
      {
        name: 'destination',
        label: 'Send Remainder To',
        type: 'address',
        placeholder: '0x... or name.eth',
        required: true,
        helpText: 'Address that will receive the unvested portion as a single lump-sum payment. To pay this address gradually instead, use Create Payment Stream.'
      }
    ]
  },

  'stream-restream': {
    id: 'stream-restream',
    category: 'streams',
    name: 'Re-stream Payment',
    description: 'Cancel a stream and create a new one funded by the unvested remainder',
    isMultiAction: true,
    fields: [
      {
        name: 'sourceStreamAddress',
        label: 'Stream to Re-stream',
        type: 'stream-select',
        required: true,
        helpText: 'Cancel an existing stream, and re-stream the remaining balance to a new recipient.'
      },
      {
        name: 'recipient',
        label: 'New Stream Recipient',
        type: 'address',
        placeholder: '0x... or name.eth',
        required: true,
        helpText: 'Defaults to the original recipient. Change if you want to send the new stream to a different address.'
      },
      {
        name: 'amount',
        label: 'New Stream Amount',
        type: 'amount',
        placeholder: '0.0',
        required: true,
        validation: { min: 0 },
      },
      {
        name: 'startDate',
        label: 'New Stream Start Date',
        type: 'date',
        required: true,
      },
      {
        name: 'endDate',
        label: 'New Stream End Date',
        type: 'date',
        required: true,
      },
      {
        name: 'streamAddress',
        label: 'Predicted New-Stream Address',
        type: 'predicted-stream-address',
        required: true,
      }
    ]
  },

  'payment-once': {
    id: 'payment-once',
    category: 'payments',
    name: 'Pay via USDC Payer',
    description: 'Send USDC through the DAO Payer contract — registers debt if reserves are low instead of reverting',
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

  // Meta actions — high-level proposals that trigger other on-chain effects
  'auction-bid': {
    id: 'auction-bid',
    category: 'meta',
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

/**
 * Get templates by category
 */
export function getTemplatesByCategory(category: ActionTemplate['category']): ActionTemplate[] {
  return Object.values(ACTION_TEMPLATES).filter(
    (template) => template.category === category,
  );
}

/**
 * Get template by ID
 */
export function getTemplate(id: ActionTemplateType): ActionTemplate | undefined {
  return ACTION_TEMPLATES[id];
}
