/**
 * octant-vault-create-sky — deploy a yield-donating Sky Compounder Dragon vault.
 * Hardcoded asset: USDS (18 decimals).
 */

import { type Address, decodeAbiParameters, parseAbiParameters } from 'viem';
import {
  OCTANT_SKY_FACTORY_ADDRESS,
  OCTANT_YIELD_DONATING_STRATEGY_ADDRESS,
  USDS_ADDRESS,
} from '../../actionTemplates/constants';
import type { ActionDescription, TransactionActionDef } from '../types';
import {
  BASE_CREATE_SIG,
  type BaseVaultCreateFields,
  assembleBundle,
  encodeBaseCreate,
  formatSeedAmount,
  matchVaultCreateBundle,
  maybeSeedActions,
  maybeSplitterAction,
  stringifyNewSplitterPayload,
} from './_shared-create';

const FACTORY = OCTANT_SKY_FACTORY_ADDRESS as Address;
const IMPL_FALLBACK = OCTANT_YIELD_DONATING_STRATEGY_ADDRESS as Address;
const ASSET = USDS_ADDRESS as Address;
const ASSET_DECIMALS = 18;

export const octantVaultCreateSky: TransactionActionDef<BaseVaultCreateFields> = {
  id: 'octant-vault-create-sky',
  category: 'octant',
  name: 'Create Octant Sky Vault',
  description:
    'Deploy a yield-donating Octant Dragon vault on Sky (USDS underlying)',
  isMultiAction: true,
  fields: [
    { name: 'vaultName', label: 'Vault Name', type: 'text', required: true },
    { name: 'vaultSymbol', label: 'Vault Symbol', type: 'text', required: true },
    { name: 'management', label: 'Management', type: 'address' },
    { name: 'keeper', label: 'Keeper', type: 'address', required: true },
    { name: 'emergencyAdmin', label: 'Emergency Admin', type: 'address' },
    { name: 'donationAddress', label: 'Donation Target', type: 'address', required: true },
    { name: 'enableBurning', label: 'Enable Burning', type: 'select', options: [
      { label: 'Yes', value: 'true' },
      { label: 'No', value: 'false' },
    ] },
    { name: 'tokenizedStrategyAddress', label: 'Strategy Implementation', type: 'address' },
    { name: 'seedAmount', label: 'Initial Seed (USDS)', type: 'amount' },
    { name: 'predictedVault', label: 'Predicted Vault Address', type: 'address' },
  ],

  encode(values) {
    const create = encodeBaseCreate(FACTORY, values, IMPL_FALLBACK);
    const splitter = maybeSplitterAction(values);
    const seed = maybeSeedActions(values, { asset: ASSET, decimals: ASSET_DECIMALS });
    return assembleBundle('octant-vault-create-sky', values, create, splitter, seed);
  },

  decode(actions, cursor) {
    const match = matchVaultCreateBundle(actions, cursor, FACTORY, BASE_CREATE_SIG);
    if (!match) return null;

    const create = actions[match.createIdx];
    const decoded = decodeAbiParameters(
      parseAbiParameters('string, string, address, address, address, address, bool, address'),
      (create.calldata.startsWith('0x') ? create.calldata : `0x${create.calldata}`) as `0x${string}`,
    ) as readonly [string, string, Address, Address, Address, Address, boolean, Address];

    const values: BaseVaultCreateFields = {
      vaultName: decoded[0],
      vaultSymbol: decoded[1],
      management: decoded[2],
      keeper: decoded[3],
      emergencyAdmin: decoded[4],
      donationAddress: decoded[5],
      enableBurning: decoded[6] ? 'true' : 'false',
      tokenizedStrategyAddress: decoded[7],
    };

    if (match.splitter) {
      values.newSplitterPayload = stringifyNewSplitterPayload(
        match.splitter,
        decoded[5],
      );
    }
    if (match.seed) {
      values.seedAmount = formatSeedAmount(match.seed.amount, ASSET_DECIMALS);
      values.predictedVault = match.seed.predictedVault;
    }

    return { values, consumed: match.consumed };
  },

  describe(values) {
    const descriptions: ActionDescription[] = [];
    if (values.newSplitterPayload) {
      descriptions.push({
        title: 'Deploy donation splitter',
        functionName: 'createPaymentSplitter',
      });
    }
    descriptions.push({
      title: `Create Octant Sky vault "${values.vaultName}"`,
      functionName: 'createStrategy',
      params: { name: values.vaultName, symbol: values.vaultSymbol },
    });
    if (values.seedAmount && parseFloat(values.seedAmount) > 0) {
      descriptions.push({
        title: `Approve ${values.seedAmount} USDS`,
        description: 'for the new vault',
        functionName: 'approve',
      });
      descriptions.push({
        title: `Seed vault with ${values.seedAmount} USDS`,
        functionName: 'deposit',
      });
    }
    return descriptions;
  },
};
