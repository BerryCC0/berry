/**
 * Nouns Descriptor admin actions.
 *
 * The 4 `descriptor-add-trait-*` templates stay in the legacy generator for
 * now — their artwork-wizard editor integration (readOnly round-trip
 * semantics) is better migrated in a focused UI PR.
 */

import { type Address } from 'viem';
import { NOUNS_ADDRESSES } from '@/app/lib/nouns';
import {
  makeAddressAction,
  makeNoArgAction,
  makeStringAction,
} from '../shared/factories';
import { descriptorAddManyBackgrounds } from './add-many-backgrounds';

const TARGET = NOUNS_ADDRESSES.descriptor as Address;

// ----- No-arg setters -------------------------------------------------------

export const descriptorLockParts = makeNoArgAction({
  id: 'descriptor-lock-parts',
  name: 'Lock Parts (Irreversible)',
  description:
    'Permanently freezes the Descriptor — no further trait additions or updates can be made',
  category: 'descriptor',
  target: TARGET,
  signature: 'lockParts()',
});

export const descriptorToggleDataUri = makeNoArgAction({
  id: 'descriptor-toggle-data-uri',
  name: 'Toggle Data URI',
  description: 'Switch between on-chain SVG (data URI) and base-URI rendering',
  category: 'descriptor',
  target: TARGET,
  signature: 'toggleDataURIEnabled()',
});

// ----- Address setters ------------------------------------------------------

export const descriptorSetArt = makeAddressAction({
  id: 'descriptor-set-art',
  name: 'Set Art Contract',
  description: 'Replace the on-chain art storage contract',
  category: 'descriptor',
  target: TARGET,
  signature: 'setArt(address)',
  field: { name: 'address', label: 'Art Contract' },
});

export const descriptorSetRenderer = makeAddressAction({
  id: 'descriptor-set-renderer',
  name: 'Set Renderer',
  description: 'Replace the SVG renderer contract',
  category: 'descriptor',
  target: TARGET,
  signature: 'setRenderer(address)',
  field: { name: 'address', label: 'Renderer' },
});

export const descriptorSetArtDescriptor = makeAddressAction({
  id: 'descriptor-set-art-descriptor',
  name: 'Set Art Descriptor',
  description: 'Set the descriptor field on the Art contract itself',
  category: 'descriptor',
  target: TARGET,
  signature: 'setArtDescriptor(address)',
  field: { name: 'address', label: 'Art Descriptor' },
});

export const descriptorSetArtInflator = makeAddressAction({
  id: 'descriptor-set-art-inflator',
  name: 'Set Art Inflator',
  description: 'Replace the inflator (decompresses trait bytes)',
  category: 'descriptor',
  target: TARGET,
  signature: 'setArtInflator(address)',
  field: { name: 'address', label: 'Inflator' },
});

export const descriptorTransferOwnership = makeAddressAction({
  id: 'descriptor-transfer-ownership',
  name: 'Transfer Descriptor Ownership',
  description: 'Move ownership of the Descriptor contract',
  category: 'descriptor',
  target: TARGET,
  signature: 'transferOwnership(address)',
  field: { name: 'address', label: 'New Owner' },
});

// ----- String setters -------------------------------------------------------

export const descriptorSetBaseUri = makeStringAction({
  id: 'descriptor-set-base-uri',
  name: 'Set Base URI',
  description: 'Off-chain base URI used when on-chain data URI is disabled',
  category: 'descriptor',
  target: TARGET,
  signature: 'setBaseURI(string)',
  field: { name: 'baseURI', label: 'Base URI', placeholder: 'https://...' },
});

export const descriptorAddBackground = makeStringAction({
  id: 'descriptor-add-background',
  name: 'Add Background Color',
  description: 'Append a single background color to the descriptor palette',
  category: 'descriptor',
  target: TARGET,
  signature: 'addBackground(string)',
  field: {
    name: 'color',
    label: 'Hex Color',
    placeholder: 'e6e6e6',
    helpText: '6-digit hex; no leading #',
  },
});

export { descriptorAddManyBackgrounds };
