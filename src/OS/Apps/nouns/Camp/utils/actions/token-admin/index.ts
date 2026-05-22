/**
 * token-admin — Nouns Token core admin setters.
 */

import { type Address } from 'viem';
import { NOUNS_ADDRESSES } from '@/app/lib/nouns';
import {
  makeAddressAction,
  makeStringAction,
} from '../shared/factories';

const TARGET = NOUNS_ADDRESSES.token as Address;

export const adminTokenMinter = makeAddressAction({
  id: 'admin-token-minter',
  name: 'Set Token Minter',
  description: 'Contract authorised to mint new Nouns',
  category: 'governance-admin',
  target: TARGET,
  signature: 'setMinter(address)',
  field: { name: 'address', label: 'Minter' },
});

export const adminTokenDescriptor = makeAddressAction({
  id: 'admin-token-descriptor',
  name: 'Set Token Descriptor',
  description: 'Descriptor contract used by the Token for trait rendering',
  category: 'governance-admin',
  target: TARGET,
  signature: 'setDescriptor(address)',
  field: { name: 'address', label: 'Descriptor' },
});

export const adminTokenSeeder = makeAddressAction({
  id: 'admin-token-seeder',
  name: 'Set Token Seeder',
  description: 'Seeder contract that picks pseudo-random traits at mint',
  category: 'governance-admin',
  target: TARGET,
  signature: 'setSeeder(address)',
  field: { name: 'address', label: 'Seeder' },
});

export const adminTokenNoundersDao = makeAddressAction({
  id: 'admin-token-nounders-dao',
  name: 'Set Nounders DAO',
  description: 'Address that receives the every-10th-Noun rewards',
  category: 'governance-admin',
  target: TARGET,
  signature: 'setNoundersDAO(address)',
  field: { name: 'address', label: 'Nounders DAO' },
});

export const adminTokenContractUriHash = makeStringAction({
  id: 'admin-token-contract-uri-hash',
  name: 'Set Contract URI Hash',
  description: 'IPFS CID used for the OpenSea-style collection contract URI',
  category: 'governance-admin',
  target: TARGET,
  signature: 'setContractURIHash(string)',
  field: { name: 'hash', label: 'IPFS Hash' },
});
