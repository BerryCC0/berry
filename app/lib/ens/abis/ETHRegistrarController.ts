/**
 * ENS ETHRegistrarController (latest, v3+)
 *
 * Address: 0x59E16fcCd424Cc24e280Be16E11Bcd56fb0CE547
 *
 * This is the public entry point for .eth registration. It calls into
 * BaseRegistrar under the hood. Critically, this contract emits the
 * registered name as a string, which lets us recover labels for the
 * labelhash-only NameRegistered events from BaseRegistrar.
 */

export const ETHRegistrarControllerABI = [
  {
    type: 'event',
    name: 'NameRegistered',
    inputs: [
      { name: 'name', type: 'string', indexed: false },
      { name: 'label', type: 'bytes32', indexed: true },
      { name: 'owner', type: 'address', indexed: true },
      { name: 'baseCost', type: 'uint256', indexed: false },
      { name: 'premium', type: 'uint256', indexed: false },
      { name: 'expires', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'NameRenewed',
    inputs: [
      { name: 'name', type: 'string', indexed: false },
      { name: 'label', type: 'bytes32', indexed: true },
      { name: 'cost', type: 'uint256', indexed: false },
      { name: 'expires', type: 'uint256', indexed: false },
    ],
  },
] as const;
