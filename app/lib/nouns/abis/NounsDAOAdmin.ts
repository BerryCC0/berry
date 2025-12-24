/**
 * Nouns DAO Admin ABI
 * Contract: 0xd7c7c3c447Df757a77C81FcFf07f10bB22d98f4a
 * 
 * Manages DAO configuration parameters including voting, quorum, and fork settings.
 */

export const NounsDAOAdminABI = [
  {
    "inputs": [],
    "name": "AdminOnly",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "DuplicateTokenAddress",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "ForkPeriodTooLong",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "ForkPeriodTooShort",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidMaxQuorumVotesBPS",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidMinQuorumVotesBPS",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidObjectionPeriodDurationInBlocks",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidProposalUpdatablePeriodInBlocks",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "MinQuorumBPSGreaterThanMaxQuorumBPS",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "PendingVetoerOnly",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "UnsafeUint16Cast",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "VetoerOnly",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "VoteSnapshotSwitchAlreadySet",
    "type": "error"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "address[]",
        "name": "oldErc20Tokens",
        "type": "address[]"
      },
      {
        "indexed": false,
        "internalType": "address[]",
        "name": "newErc20tokens",
        "type": "address[]"
      }
    ],
    "name": "ERC20TokensToIncludeInForkSet",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "address",
        "name": "oldForkDAODeployer",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "newForkDAODeployer",
        "type": "address"
      }
    ],
    "name": "ForkDAODeployerSet",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "address",
        "name": "oldForkEscrow",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "newForkEscrow",
        "type": "address"
      }
    ],
    "name": "ForkEscrowSet",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "oldForkPeriod",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "newForkPeriod",
        "type": "uint256"
      }
    ],
    "name": "ForkPeriodSet",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "oldForkThreshold",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "newForkThreshold",
        "type": "uint256"
      }
    ],
    "name": "ForkThresholdSet",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint32",
        "name": "oldLastMinuteWindowInBlocks",
        "type": "uint32"
      },
      {
        "indexed": false,
        "internalType": "uint32",
        "name": "newLastMinuteWindowInBlocks",
        "type": "uint32"
      }
    ],
    "name": "LastMinuteWindowSet",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint16",
        "name": "oldMaxQuorumVotesBPS",
        "type": "uint16"
      },
      {
        "indexed": false,
        "internalType": "uint16",
        "name": "newMaxQuorumVotesBPS",
        "type": "uint16"
      }
    ],
    "name": "MaxQuorumVotesBPSSet",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint16",
        "name": "oldMinQuorumVotesBPS",
        "type": "uint16"
      },
      {
        "indexed": false,
        "internalType": "uint16",
        "name": "newMinQuorumVotesBPS",
        "type": "uint16"
      }
    ],
    "name": "MinQuorumVotesBPSSet",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "address",
        "name": "oldAdmin",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "newAdmin",
        "type": "address"
      }
    ],
    "name": "NewAdmin",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "address",
        "name": "oldPendingAdmin",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "newPendingAdmin",
        "type": "address"
      }
    ],
    "name": "NewPendingAdmin",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "address",
        "name": "oldPendingVetoer",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "newPendingVetoer",
        "type": "address"
      }
    ],
    "name": "NewPendingVetoer",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "address",
        "name": "oldVetoer",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "newVetoer",
        "type": "address"
      }
    ],
    "name": "NewVetoer",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint32",
        "name": "oldObjectionPeriodDurationInBlocks",
        "type": "uint32"
      },
      {
        "indexed": false,
        "internalType": "uint32",
        "name": "newObjectionPeriodDurationInBlocks",
        "type": "uint32"
      }
    ],
    "name": "ObjectionPeriodDurationSet",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "oldProposalThresholdBPS",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "newProposalThresholdBPS",
        "type": "uint256"
      }
    ],
    "name": "ProposalThresholdBPSSet",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint32",
        "name": "oldProposalUpdatablePeriodInBlocks",
        "type": "uint32"
      },
      {
        "indexed": false,
        "internalType": "uint32",
        "name": "newProposalUpdatablePeriodInBlocks",
        "type": "uint32"
      }
    ],
    "name": "ProposalUpdatablePeriodSet",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint32",
        "name": "oldQuorumCoefficient",
        "type": "uint32"
      },
      {
        "indexed": false,
        "internalType": "uint32",
        "name": "newQuorumCoefficient",
        "type": "uint32"
      }
    ],
    "name": "QuorumCoefficientSet",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "address",
        "name": "timelock",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "timelockV1",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "admin",
        "type": "address"
      }
    ],
    "name": "TimelocksAndAdminSet",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "oldVotingDelay",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "newVotingDelay",
        "type": "uint256"
      }
    ],
    "name": "VotingDelaySet",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "oldVotingPeriod",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "newVotingPeriod",
        "type": "uint256"
      }
    ],
    "name": "VotingPeriodSet",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "bool",
        "name": "sent",
        "type": "bool"
      }
    ],
    "name": "Withdraw",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "MAX_FORK_PERIOD",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "MAX_OBJECTION_PERIOD_BLOCKS",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "MAX_PROPOSAL_THRESHOLD_BPS",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "MAX_QUORUM_VOTES_BPS_UPPER_BOUND",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "MAX_UPDATABLE_PERIOD_BLOCKS",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "MAX_VOTING_DELAY_BLOCKS",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "MAX_VOTING_PERIOD_BLOCKS",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "MIN_FORK_PERIOD",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "MIN_PROPOSAL_THRESHOLD_BPS",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "MIN_QUORUM_VOTES_BPS_LOWER_BOUND",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "MIN_QUORUM_VOTES_BPS_UPPER_BOUND",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "MIN_VOTING_DELAY_BLOCKS",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "MIN_VOTING_PERIOD_BLOCKS",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

