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

  // Token Buyer / USDC Payer system
  'tokenbuyer-refill-eth': {
    id: 'tokenbuyer-refill-eth',
    category: 'swaps',
    name: 'Refill TokenBuyer (ETH)',
    description: 'Send ETH to the TokenBuyer so it can keep paying out to bots arbing USDC into the Payer',
    isMultiAction: false,
    fields: [
      {
        name: 'ethAmount',
        label: 'ETH Amount',
        type: 'amount',
        placeholder: '0.0',
        required: true,
        validation: { min: 0, decimals: 18 },
      }
    ]
  },

  'payer-repay-debt': {
    id: 'payer-repay-debt',
    category: 'swaps',
    name: 'Repay Payer Debt',
    description: 'Send USDC to the Payer and clear queued debt entries — useful when bots haven’t kept up with payouts',
    isMultiAction: true,
    fields: [
      {
        name: 'usdcAmount',
        label: 'USDC Amount',
        type: 'amount',
        placeholder: '0.0',
        required: true,
        validation: { min: 0, decimals: 6 },
      }
    ]
  },

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

  // Artwork — Nouns Descriptor configuration
  'descriptor-lock-parts': {
    id: 'descriptor-lock-parts',
    category: 'artwork',
    name: 'Lock Parts (Irreversible)',
    description: 'Permanently freezes the Descriptor — no further trait additions or updates can be made. This cannot be undone.',
    isMultiAction: false,
    fields: [],
  },

  'descriptor-toggle-data-uri': {
    id: 'descriptor-toggle-data-uri',
    category: 'artwork',
    name: 'Toggle On-Chain Rendering',
    description: 'Flip between on-chain SVG rendering and off-chain base-URI rendering',
    isMultiAction: false,
    fields: [],
  },

  'descriptor-set-base-uri': {
    id: 'descriptor-set-base-uri',
    category: 'artwork',
    name: 'Set Base URI',
    description: 'HTTP base URL used when on-chain rendering is disabled. Token URIs become `{baseURI}{tokenId}`.',
    isMultiAction: false,
    fields: [
      {
        name: 'baseURI',
        label: 'Base URI',
        type: 'text',
        placeholder: 'https://nouns.example.com/metadata/',
        required: true,
      },
    ],
  },

  'descriptor-set-art': {
    id: 'descriptor-set-art',
    category: 'artwork',
    name: 'Set Art Contract',
    description: 'Swap the contract that stores Nouns trait images. Critical upgrade — verify the new contract carefully.',
    isMultiAction: false,
    fields: [
      {
        name: 'address',
        label: 'New Art Contract',
        type: 'address',
        placeholder: '0x...',
        required: true,
      },
    ],
  },

  'descriptor-set-renderer': {
    id: 'descriptor-set-renderer',
    category: 'artwork',
    name: 'Set Renderer',
    description: 'Swap the contract that renders trait images into SVGs',
    isMultiAction: false,
    fields: [
      {
        name: 'address',
        label: 'New Renderer',
        type: 'address',
        placeholder: '0x...',
        required: true,
      },
    ],
  },

  'descriptor-set-art-descriptor': {
    id: 'descriptor-set-art-descriptor',
    category: 'artwork',
    name: 'Set Art Descriptor',
    description: 'Swap the Art contract’s pointer back to its Descriptor (used when migrating Descriptor contracts)',
    isMultiAction: false,
    fields: [
      {
        name: 'address',
        label: 'New Art Descriptor',
        type: 'address',
        placeholder: '0x...',
        required: true,
      },
    ],
  },

  'descriptor-set-art-inflator': {
    id: 'descriptor-set-art-inflator',
    category: 'artwork',
    name: 'Set Art Inflator',
    description: 'Swap the bytecode decompression contract used to expand compressed trait images',
    isMultiAction: false,
    fields: [
      {
        name: 'address',
        label: 'New Inflator',
        type: 'address',
        placeholder: '0x...',
        required: true,
      },
    ],
  },

  'descriptor-transfer-ownership': {
    id: 'descriptor-transfer-ownership',
    category: 'artwork',
    name: 'Transfer Descriptor Ownership',
    description: 'Hand over Descriptor admin control to a new owner. After transfer, only that address can call setArt / setRenderer / addHeads / etc.',
    isMultiAction: false,
    fields: [
      {
        name: 'address',
        label: 'New Owner',
        type: 'address',
        placeholder: '0x...',
        required: true,
      },
    ],
  },

  'descriptor-add-background': {
    id: 'descriptor-add-background',
    category: 'artwork',
    name: 'Add Background Color',
    description: 'Append a single hex color to the Descriptor’s background palette',
    isMultiAction: false,
    fields: [
      {
        name: 'color',
        label: 'Hex Color (no #)',
        type: 'text',
        placeholder: 'e1d7d5',
        required: true,
      },
    ],
  },

  'descriptor-add-many-backgrounds': {
    id: 'descriptor-add-many-backgrounds',
    category: 'artwork',
    name: 'Add Many Background Colors',
    description: 'Append multiple hex colors to the Descriptor’s background palette in one call',
    isMultiAction: false,
    fields: [
      {
        name: 'colors',
        label: 'Hex Colors (comma-separated, no #)',
        type: 'text',
        placeholder: 'e1d7d5, d5d7e1, e1c2c4',
        required: true,
      },
    ],
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

  // Admin Functions — TokenBuyer parameters
  'admin-tokenbuyer-baseline': {
    id: 'admin-tokenbuyer-baseline',
    category: 'admin',
    name: 'Set TokenBuyer Baseline',
    description: 'Adjust the USDC reserve target the TokenBuyer aims to drain bots up to before pausing',
    isMultiAction: false,
    fields: [
      {
        name: 'amount',
        label: 'Baseline (USDC)',
        type: 'amount',
        placeholder: '0',
        required: true,
        validation: { min: 0, decimals: 6 },
      },
    ],
  },

  'admin-tokenbuyer-discount': {
    id: 'admin-tokenbuyer-discount',
    category: 'admin',
    name: 'Set TokenBuyer Bot Discount',
    description: 'Adjust the basis-point discount bots receive when arbing USDC into the Payer',
    isMultiAction: false,
    fields: [
      {
        name: 'bps',
        label: 'Discount (BPS, 100 = 1%)',
        type: 'number',
        placeholder: '150',
        required: true,
        validation: { min: 0, max: 10000 },
      },
    ],
  },

  'admin-tokenbuyer-pause': {
    id: 'admin-tokenbuyer-pause',
    category: 'admin',
    name: 'Pause TokenBuyer',
    description: 'Emergency: stop new buyETH calls. Existing ETH balance is unaffected.',
    isMultiAction: false,
    fields: [],
  },

  'admin-tokenbuyer-unpause': {
    id: 'admin-tokenbuyer-unpause',
    category: 'admin',
    name: 'Unpause TokenBuyer',
    description: 'Resume buyETH calls after a pause',
    isMultiAction: false,
    fields: [],
  },

  'admin-tokenbuyer-withdraw-eth': {
    id: 'admin-tokenbuyer-withdraw-eth',
    category: 'admin',
    name: 'Withdraw ETH from TokenBuyer',
    description: 'Pull all ETH out of the TokenBuyer contract back to its owner (the treasury)',
    isMultiAction: false,
    fields: [],
  },

  // Admin Functions — Payer parameters
  'admin-payer-withdraw-usdc': {
    id: 'admin-payer-withdraw-usdc',
    category: 'admin',
    name: 'Withdraw USDC from Payer',
    description: 'Pull all USDC out of the Payer contract back to its owner (the treasury)',
    isMultiAction: false,
    fields: [],
  },

  // Admin Functions — TokenBuyer extra setters
  'admin-tokenbuyer-admin': {
    id: 'admin-tokenbuyer-admin',
    category: 'admin',
    name: 'Set TokenBuyer Admin',
    description: 'Hand off the TokenBuyer admin role to a new address',
    isMultiAction: false,
    fields: [
      {
        name: 'address',
        label: 'New Admin Address',
        type: 'address',
        placeholder: '0x... or name.eth',
        required: true,
      },
    ],
  },

  'admin-tokenbuyer-price-feed': {
    id: 'admin-tokenbuyer-price-feed',
    category: 'admin',
    name: 'Set TokenBuyer Price Feed',
    description: 'Update the Chainlink price oracle TokenBuyer uses for ETH/USDC pricing',
    isMultiAction: false,
    fields: [
      {
        name: 'address',
        label: 'Price Feed Address',
        type: 'address',
        placeholder: '0x...',
        required: true,
        helpText: 'Chainlink aggregator contract for ETH/USD',
      },
    ],
  },

  'admin-tokenbuyer-payer': {
    id: 'admin-tokenbuyer-payer',
    category: 'admin',
    name: 'Set TokenBuyer Payer',
    description: 'Change the downstream Payer contract that TokenBuyer forwards USDC to',
    isMultiAction: false,
    fields: [
      {
        name: 'address',
        label: 'Payer Address',
        type: 'address',
        placeholder: '0x...',
        required: true,
      },
    ],
  },

  // Admin Functions — Auction House
  'admin-auction-reserve-price': {
    id: 'admin-auction-reserve-price',
    category: 'admin',
    name: 'Set Auction Reserve Price',
    description: 'Minimum bid required for an auction to settle',
    isMultiAction: false,
    fields: [
      {
        name: 'amount',
        label: 'Reserve Price (ETH)',
        type: 'amount',
        placeholder: '0.1',
        required: true,
        validation: { min: 0, decimals: 18 },
        helpText: 'Auctions below this price will not settle and the Noun is burned',
      },
    ],
  },

  'admin-auction-time-buffer': {
    id: 'admin-auction-time-buffer',
    category: 'admin',
    name: 'Set Auction Time Buffer',
    description: 'Anti-snipe extension: if a bid lands within this many seconds of the end, the auction extends by the same amount',
    isMultiAction: false,
    fields: [
      {
        name: 'seconds',
        label: 'Time Buffer (seconds)',
        type: 'number',
        placeholder: '300',
        required: true,
        validation: { min: 0 },
        helpText: '5 minutes = 300 seconds',
      },
    ],
  },

  'admin-auction-min-bid-increment': {
    id: 'admin-auction-min-bid-increment',
    category: 'admin',
    name: 'Set Min Bid Increment',
    description: 'Minimum bid increment over the current bid, as a percentage',
    isMultiAction: false,
    fields: [
      {
        name: 'percentage',
        label: 'Min Bid Increment (%)',
        type: 'number',
        placeholder: '2',
        required: true,
        validation: { min: 1, max: 100 },
        helpText: 'Each new bid must exceed the current bid by at least this percentage',
      },
    ],
  },

  'admin-auction-pause': {
    id: 'admin-auction-pause',
    category: 'admin',
    name: 'Pause Auction House',
    description: 'Emergency: stop new auctions from starting. Existing auctions can still settle.',
    isMultiAction: false,
    fields: [],
  },

  'admin-auction-unpause': {
    id: 'admin-auction-unpause',
    category: 'admin',
    name: 'Unpause Auction House',
    description: 'Resume auction creation after a pause',
    isMultiAction: false,
    fields: [],
  },

  'admin-auction-sanctions-oracle': {
    id: 'admin-auction-sanctions-oracle',
    category: 'admin',
    name: 'Set Sanctions Oracle',
    description: 'Update the Chainalysis sanctions oracle that blocks sanctioned addresses from bidding',
    isMultiAction: false,
    fields: [
      {
        name: 'address',
        label: 'Sanctions Oracle Address',
        type: 'address',
        placeholder: '0x...',
        required: true,
      },
    ],
  },

  // Admin Functions — Client Rewards
  'admin-rewards-auction-params': {
    id: 'admin-rewards-auction-params',
    category: 'admin',
    name: 'Set Auction Reward Params',
    description: 'Configure the auction client reward percentage and minimum auctions between updates',
    isMultiAction: false,
    fields: [
      {
        name: 'auctionRewardBps',
        label: 'Auction Reward (BPS)',
        type: 'number',
        placeholder: '100',
        required: true,
        validation: { min: 0, max: 10000 },
        helpText: '100 BPS = 1% of the winning bid distributed to the bid client',
      },
      {
        name: 'minimumAuctionsBetweenUpdates',
        label: 'Min Auctions Between Updates',
        type: 'number',
        placeholder: '1',
        required: true,
        validation: { min: 0, max: 255 },
        helpText: 'Throttle reward distribution so it batches every N auctions',
      },
    ],
  },

  'admin-rewards-proposal-params': {
    id: 'admin-rewards-proposal-params',
    category: 'admin',
    name: 'Set Proposal Reward Params',
    description: 'Configure proposal/voting reward percentages and eligibility thresholds',
    isMultiAction: false,
    fields: [
      {
        name: 'minimumRewardPeriod',
        label: 'Min Reward Period (seconds)',
        type: 'number',
        placeholder: '1209600',
        required: true,
        validation: { min: 0 },
        helpText: '14 days = 1209600 seconds. Throttles how often rewards are distributed.',
      },
      {
        name: 'numProposalsEnoughForReward',
        label: 'Min Proposals For Reward',
        type: 'number',
        placeholder: '7',
        required: true,
        validation: { min: 0, max: 255 },
        helpText: 'Minimum proposals settled in the reward period before payout',
      },
      {
        name: 'proposalRewardBps',
        label: 'Proposal Reward (BPS)',
        type: 'number',
        placeholder: '100',
        required: true,
        validation: { min: 0, max: 10000 },
        helpText: 'Share of auction revenue paid to proposers',
      },
      {
        name: 'votingRewardBps',
        label: 'Voting Reward (BPS)',
        type: 'number',
        placeholder: '50',
        required: true,
        validation: { min: 0, max: 10000 },
        helpText: 'Share of auction revenue paid to voters',
      },
      {
        name: 'proposalEligibilityQuorumBps',
        label: 'Eligibility Quorum (BPS)',
        type: 'number',
        placeholder: '1000',
        required: true,
        validation: { min: 0, max: 10000 },
        helpText: 'Quorum threshold a proposal must hit to be eligible for proposer rewards',
      },
    ],
  },

  'admin-rewards-client-approval': {
    id: 'admin-rewards-client-approval',
    category: 'admin',
    name: 'Approve/Suspend Client',
    description: 'Approve or suspend a registered client from receiving rewards',
    isMultiAction: false,
    fields: [
      {
        name: 'clientId',
        label: 'Client ID',
        type: 'number',
        placeholder: '11',
        required: true,
        validation: { min: 0 },
        helpText: 'On-chain client ID assigned at registration (Berry = 11)',
      },
      {
        name: 'approved',
        label: 'Status',
        type: 'select',
        required: true,
        options: [
          { label: 'Approved (can receive rewards)', value: 'true' },
          { label: 'Suspended (no rewards)', value: 'false' },
        ],
      },
    ],
  },

  'admin-rewards-enable-auction': {
    id: 'admin-rewards-enable-auction',
    category: 'admin',
    name: 'Enable Auction Rewards',
    description: 'Turn on auction-client reward tracking and payouts',
    isMultiAction: false,
    fields: [],
  },

  'admin-rewards-disable-auction': {
    id: 'admin-rewards-disable-auction',
    category: 'admin',
    name: 'Disable Auction Rewards',
    description: 'Pause auction-client reward tracking. In-flight rewards still claimable.',
    isMultiAction: false,
    fields: [],
  },

  'admin-rewards-enable-proposal': {
    id: 'admin-rewards-enable-proposal',
    category: 'admin',
    name: 'Enable Proposal Rewards',
    description: 'Turn on proposer/voter reward tracking and payouts',
    isMultiAction: false,
    fields: [],
  },

  'admin-rewards-disable-proposal': {
    id: 'admin-rewards-disable-proposal',
    category: 'admin',
    name: 'Disable Proposal Rewards',
    description: 'Pause proposer/voter reward tracking. In-flight rewards still claimable.',
    isMultiAction: false,
    fields: [],
  },

  'admin-rewards-admin': {
    id: 'admin-rewards-admin',
    category: 'admin',
    name: 'Set Rewards Admin',
    description: 'Hand off the ClientRewards admin role to a new address',
    isMultiAction: false,
    fields: [
      {
        name: 'address',
        label: 'New Admin Address',
        type: 'address',
        placeholder: '0x... or name.eth',
        required: true,
      },
    ],
  },

  'admin-rewards-descriptor': {
    id: 'admin-rewards-descriptor',
    category: 'admin',
    name: 'Set Rewards Descriptor',
    description: 'Update the descriptor contract used for reward-NFT metadata',
    isMultiAction: false,
    fields: [
      {
        name: 'address',
        label: 'Descriptor Address',
        type: 'address',
        placeholder: '0x...',
        required: true,
      },
    ],
  },

  'admin-rewards-eth-token': {
    id: 'admin-rewards-eth-token',
    category: 'admin',
    name: 'Set Rewards ETH Token',
    description: 'Update the wrapped-ETH token address used for reward payouts',
    isMultiAction: false,
    fields: [
      {
        name: 'address',
        label: 'ETH Token Address',
        type: 'address',
        placeholder: '0x... (typically WETH)',
        required: true,
      },
    ],
  },

  // Admin Functions — DAO Data (Proposal Candidates) Proxy
  'admin-data-create-cost': {
    id: 'admin-data-create-cost',
    category: 'admin',
    name: 'Set Candidate Creation Cost',
    description: 'Fee charged to non-Nouner addresses to create a proposal candidate',
    isMultiAction: false,
    fields: [
      {
        name: 'amount',
        label: 'Cost (ETH)',
        type: 'amount',
        placeholder: '0.01',
        required: true,
        validation: { min: 0, decimals: 18 },
        helpText: 'Nouners pay zero. Non-Nouners pay this fee to create a candidate.',
      },
    ],
  },

  'admin-data-update-cost': {
    id: 'admin-data-update-cost',
    category: 'admin',
    name: 'Set Candidate Update Cost',
    description: 'Fee charged to non-Nouner addresses to update an existing proposal candidate',
    isMultiAction: false,
    fields: [
      {
        name: 'amount',
        label: 'Cost (ETH)',
        type: 'amount',
        placeholder: '0.005',
        required: true,
        validation: { min: 0, decimals: 18 },
      },
    ],
  },

  'admin-data-fee-recipient': {
    id: 'admin-data-fee-recipient',
    category: 'admin',
    name: 'Set Candidate Fee Recipient',
    description: 'Address that receives candidate creation/update fees',
    isMultiAction: false,
    fields: [
      {
        name: 'address',
        label: 'Fee Recipient Address',
        type: 'address',
        placeholder: '0x... or name.eth',
        required: true,
      },
    ],
  },

  'admin-data-withdraw-eth': {
    id: 'admin-data-withdraw-eth',
    category: 'admin',
    name: 'Withdraw Candidate Fees',
    description: 'Sweep accumulated ETH out of the DAO Data Proxy',
    isMultiAction: false,
    fields: [
      {
        name: 'recipient',
        label: 'Recipient',
        type: 'address',
        placeholder: '0x... or name.eth',
        required: true,
      },
      {
        name: 'amount',
        label: 'Amount (ETH)',
        type: 'amount',
        placeholder: '0',
        required: true,
        validation: { min: 0, decimals: 18 },
      },
    ],
  },

  'admin-data-duna-admin': {
    id: 'admin-data-duna-admin',
    category: 'admin',
    name: 'Set DUNA Admin',
    description: 'Update the Wyoming DUNA administrator address (compliance/DUNA-Act role)',
    isMultiAction: false,
    fields: [
      {
        name: 'address',
        label: 'DUNA Admin Address',
        type: 'address',
        placeholder: '0x... or name.eth',
        required: true,
      },
    ],
  },

  // Admin Functions — Nouns Token core swaps
  'admin-token-minter': {
    id: 'admin-token-minter',
    category: 'admin',
    name: 'Set Token Minter',
    description: 'Change the contract authorised to mint Nouns (typically the Auction House)',
    isMultiAction: false,
    fields: [
      {
        name: 'address',
        label: 'Minter Address',
        type: 'address',
        placeholder: '0x...',
        required: true,
        helpText: 'Usually the Auction House. Changing this hands minting authority to another contract.',
      },
    ],
  },

  'admin-token-descriptor': {
    id: 'admin-token-descriptor',
    category: 'admin',
    name: 'Set Token Descriptor',
    description: 'Swap the Descriptor contract that produces Noun artwork on the token contract',
    isMultiAction: false,
    fields: [
      {
        name: 'address',
        label: 'Descriptor Address',
        type: 'address',
        placeholder: '0x...',
        required: true,
        helpText: 'Major change — affects how every Noun renders. Only valid before parts are locked.',
      },
    ],
  },

  'admin-token-seeder': {
    id: 'admin-token-seeder',
    category: 'admin',
    name: 'Set Token Seeder',
    description: 'Swap the Seeder contract that generates random trait combinations for new Nouns',
    isMultiAction: false,
    fields: [
      {
        name: 'address',
        label: 'Seeder Address',
        type: 'address',
        placeholder: '0x...',
        required: true,
      },
    ],
  },

  'admin-token-nounders-dao': {
    id: 'admin-token-nounders-dao',
    category: 'admin',
    name: 'Set Nounders DAO',
    description: 'Address that receives the founder Noun every 10th mint',
    isMultiAction: false,
    fields: [
      {
        name: 'address',
        label: 'Nounders DAO Address',
        type: 'address',
        placeholder: '0x... or name.eth',
        required: true,
      },
    ],
  },

  'admin-token-contract-uri-hash': {
    id: 'admin-token-contract-uri-hash',
    category: 'admin',
    name: 'Set Token Contract URI Hash',
    description: 'Update the collection-level metadata hash used by marketplaces',
    isMultiAction: false,
    fields: [
      {
        name: 'hash',
        label: 'Contract URI Hash',
        type: 'text',
        placeholder: 'Qm... or content hash',
        required: true,
      },
    ],
  },

  // Admin Functions — Fork Escrow
  'admin-fork-escrow-close': {
    id: 'admin-fork-escrow-close',
    category: 'admin',
    name: 'Close Fork Escrow',
    description: 'End the fork escrow window early so escrowed Nouns can be reclaimed by the DAO',
    isMultiAction: false,
    fields: [],
  },

  'admin-fork-escrow-withdraw-tokens': {
    id: 'admin-fork-escrow-withdraw-tokens',
    category: 'admin',
    name: 'Withdraw Escrowed Nouns',
    description: 'Pull a set of escrowed Nouns out of the fork escrow to a destination',
    isMultiAction: false,
    fields: [
      {
        name: 'tokenIds',
        label: 'Noun IDs (comma-separated)',
        type: 'text',
        placeholder: '12, 34, 56',
        required: true,
        helpText: 'Token IDs of the escrowed Nouns to withdraw',
      },
      {
        name: 'recipient',
        label: 'Recipient',
        type: 'address',
        placeholder: '0x... or name.eth',
        required: true,
        helpText: 'Where the withdrawn Nouns should go (typically the treasury)',
      },
    ],
  },

  'admin-fork-escrow-return-tokens': {
    id: 'admin-fork-escrow-return-tokens',
    category: 'admin',
    name: 'Return Escrowed Nouns to Owner',
    description: 'Return a set of escrowed Nouns back to the address that originally escrowed them',
    isMultiAction: false,
    fields: [
      {
        name: 'owner',
        label: 'Original Owner',
        type: 'address',
        placeholder: '0x... or name.eth',
        required: true,
        helpText: 'Address that escrowed these Nouns',
      },
      {
        name: 'tokenIds',
        label: 'Noun IDs (comma-separated)',
        type: 'text',
        placeholder: '12, 34, 56',
        required: true,
      },
    ],
  },

  // Admin Functions — ClientRewards token sweep + ownership transfer
  'admin-rewards-withdraw-token': {
    id: 'admin-rewards-withdraw-token',
    category: 'admin',
    name: 'Withdraw Token from Rewards',
    description: 'Sweep any ERC-20 the ClientRewards contract holds back to a destination (typically the treasury)',
    isMultiAction: false,
    fields: [
      {
        name: 'token',
        label: 'Token',
        type: 'token-select',
        required: true,
        helpText: 'ERC-20 to withdraw from the ClientRewards contract',
      },
      {
        name: 'recipient',
        label: 'Recipient',
        type: 'address',
        placeholder: '0x... or name.eth',
        required: true,
        helpText: 'Where to send the tokens (typically the treasury)',
      },
      {
        name: 'amount',
        label: 'Amount',
        type: 'amount',
        placeholder: '0.0',
        required: true,
        validation: { min: 0 },
      },
    ],
  },

  'admin-rewards-transfer-ownership': {
    id: 'admin-rewards-transfer-ownership',
    category: 'admin',
    name: 'Transfer Rewards Ownership',
    description: 'Transfer ownership of the ClientRewards contract (OZ Ownable role — distinct from setAdmin)',
    isMultiAction: false,
    fields: [
      {
        name: 'address',
        label: 'New Owner',
        type: 'address',
        placeholder: '0x... or name.eth',
        required: true,
      },
    ],
  },

  // Admin Functions — TokenBuyer / Payer ownership transfers + admin bounds
  'admin-tokenbuyer-transfer-ownership': {
    id: 'admin-tokenbuyer-transfer-ownership',
    category: 'admin',
    name: 'Transfer TokenBuyer Ownership',
    description: 'Transfer ownership of the TokenBuyer contract (OZ Ownable role)',
    isMultiAction: false,
    fields: [
      {
        name: 'address',
        label: 'New Owner',
        type: 'address',
        placeholder: '0x... or name.eth',
        required: true,
      },
    ],
  },

  'admin-tokenbuyer-max-baseline': {
    id: 'admin-tokenbuyer-max-baseline',
    category: 'admin',
    name: 'Set Max Admin Baseline',
    description: 'Upper bound the runtime admin may set the TokenBuyer baseline to',
    isMultiAction: false,
    fields: [
      {
        name: 'amount',
        label: 'Max Baseline (USDC)',
        type: 'amount',
        placeholder: '500000',
        required: true,
        validation: { min: 0, decimals: 6 },
        helpText: 'Guardrail: admin cannot raise the baseline above this',
      },
    ],
  },

  'admin-tokenbuyer-min-baseline': {
    id: 'admin-tokenbuyer-min-baseline',
    category: 'admin',
    name: 'Set Min Admin Baseline',
    description: 'Lower bound the runtime admin may set the TokenBuyer baseline to',
    isMultiAction: false,
    fields: [
      {
        name: 'amount',
        label: 'Min Baseline (USDC)',
        type: 'amount',
        placeholder: '50000',
        required: true,
        validation: { min: 0, decimals: 6 },
        helpText: 'Guardrail: admin cannot drop the baseline below this',
      },
    ],
  },

  'admin-tokenbuyer-max-discount': {
    id: 'admin-tokenbuyer-max-discount',
    category: 'admin',
    name: 'Set Max Admin Bot Discount',
    description: 'Upper bound (BPS) on the bot discount the runtime admin may set',
    isMultiAction: false,
    fields: [
      {
        name: 'bps',
        label: 'Max Discount (BPS)',
        type: 'number',
        placeholder: '300',
        required: true,
        validation: { min: 0, max: 10000 },
        helpText: '300 BPS = 3%',
      },
    ],
  },

  'admin-tokenbuyer-min-discount': {
    id: 'admin-tokenbuyer-min-discount',
    category: 'admin',
    name: 'Set Min Admin Bot Discount',
    description: 'Lower bound (BPS) on the bot discount the runtime admin may set',
    isMultiAction: false,
    fields: [
      {
        name: 'bps',
        label: 'Min Discount (BPS)',
        type: 'number',
        placeholder: '50',
        required: true,
        validation: { min: 0, max: 10000 },
      },
    ],
  },

  'admin-payer-transfer-ownership': {
    id: 'admin-payer-transfer-ownership',
    category: 'admin',
    name: 'Transfer Payer Ownership',
    description: 'Transfer ownership of the Payer contract (OZ Ownable role)',
    isMultiAction: false,
    fields: [
      {
        name: 'address',
        label: 'New Owner',
        type: 'address',
        placeholder: '0x... or name.eth',
        required: true,
      },
    ],
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
