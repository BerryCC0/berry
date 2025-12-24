/**
 * Fork DAO Deployer ABI
 * 
 * Contract: NounsDAOForkDeployer
 * Address: 0xcD65e61f70e0b1Aa433ca1d9A6FC2332e9e73cE3
 * 
 * The Fork DAO Deployer contract handles the deployment of a new forked DAO.
 * When a fork is executed, this contract deploys new instances of the token,
 * auction house, governor, and treasury contracts for the forked DAO.
 * 
 * Key functions:
 * - deployForkDAO: Deploy all contracts for a new fork DAO
 * - tokenImpl: Get token implementation address
 * - auctionImpl: Get auction implementation address
 * - governorImpl: Get governor implementation address
 * - treasuryImpl: Get treasury implementation address
 * - initialVotingPeriod/Delay/etc: Get initial governance parameters
 */

export const ForkDAODeployerABI = [
  {
    inputs: [
      {
        internalType: 'address',
        name: 'tokenImpl_',
        type: 'address',
      },
      {
        internalType: 'address',
        name: 'auctionImpl_',
        type: 'address',
      },
      {
        internalType: 'address',
        name: 'governorImpl_',
        type: 'address',
      },
      {
        internalType: 'address',
        name: 'treasuryImpl_',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: 'delayedGovernanceMaxDuration_',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'initialVotingPeriod_',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'initialVotingDelay_',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'initialProposalThresholdBPS_',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'initialQuorumVotesBPS_',
        type: 'uint256',
      },
    ],
    stateMutability: 'nonpayable',
    type: 'constructor',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'address',
        name: 'token',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'address',
        name: 'auction',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'address',
        name: 'governor',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'address',
        name: 'treasury',
        type: 'address',
      },
    ],
    name: 'DAODeployed',
    type: 'event',
  },
  {
    inputs: [],
    name: 'auctionImpl',
    outputs: [
      {
        internalType: 'address',
        name: '',
        type: 'address',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'delayedGovernanceMaxDuration',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: 'forkingPeriodEndTimestamp',
        type: 'uint256',
      },
      {
        internalType: 'contract INounsDAOForkEscrow',
        name: 'forkEscrow',
        type: 'address',
      },
    ],
    name: 'deployForkDAO',
    outputs: [
      {
        internalType: 'address',
        name: 'treasury',
        type: 'address',
      },
      {
        internalType: 'address',
        name: 'token',
        type: 'address',
      },
    ],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'governorImpl',
    outputs: [
      {
        internalType: 'address',
        name: '',
        type: 'address',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'initialProposalThresholdBPS',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'initialQuorumVotesBPS',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'initialVotingDelay',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'initialVotingPeriod',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'tokenImpl',
    outputs: [
      {
        internalType: 'address',
        name: '',
        type: 'address',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'treasuryImpl',
    outputs: [
      {
        internalType: 'address',
        name: '',
        type: 'address',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

