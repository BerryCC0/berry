/**
 * octant-vault-create-yearn — generic Yearn-V3 wrapper Dragon vault.
 *
 * Unlike lido/morpho/sky, the Yearn factory takes the underlying asset and
 * the source Yearn-V3 vault as explicit args (10-arg createStrategy). The
 * seed-deposit decimal scaling comes from `seedAssetDecimals` because the
 * editor doesn't know it statically.
 */

import { type Address, decodeAbiParameters, parseAbiParameters } from 'viem';
import {
  OCTANT_YEARN_FACTORY_ADDRESS,
  OCTANT_YIELD_DONATING_STRATEGY_ADDRESS,
} from '../../actionTemplates/constants';
import type { ActionDescription, TransactionActionDef } from '../types';
import {
  YEARN_CREATE_SIG,
  type YearnVaultCreateFields,
  assembleBundle,
  encodeYearnCreate,
  formatSeedAmount,
  matchVaultCreateBundle,
  maybeSeedActions,
  maybeSplitterAction,
  stringifyNewSplitterPayload,
} from './_shared-create';

const FACTORY = OCTANT_YEARN_FACTORY_ADDRESS as Address;
const IMPL_FALLBACK = OCTANT_YIELD_DONATING_STRATEGY_ADDRESS as Address;

export const octantVaultCreateYearn: TransactionActionDef<YearnVaultCreateFields> = {
  id: 'octant-vault-create-yearn',
  category: 'octant',
  name: 'Create Octant Yearn V3 Vault',
  description:
    'Wrap a Yearn V3 vault in an Octant Dragon vault — yield routed to donation address',
  isMultiAction: true,
  fields: [
    { name: 'yearnVault', label: 'Yearn V3 Vault', type: 'address', required: true },
    { name: 'asset', label: 'Underlying Asset', type: 'address', required: true },
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
    { name: 'seedAmount', label: 'Initial Seed Amount', type: 'amount' },
    { name: 'seedAssetDecimals', label: 'Seed Decimals', type: 'number', helpText: 'Decimals of the underlying asset' },
    { name: 'predictedVault', label: 'Predicted Vault Address', type: 'address' },
  ],

  encode(values) {
    const create = encodeYearnCreate(FACTORY, values, IMPL_FALLBACK);
    const splitter = maybeSplitterAction(values);
    // Yearn pulls asset address from the field; decimals from seedAssetDecimals
    // (or default 18). Other variants hardcode these per factory.
    const decimals = Number(values.seedAssetDecimals || '18');
    const asset = (values.asset || '0x0000000000000000000000000000000000000000') as Address;
    const seed =
      values.asset && values.asset.startsWith('0x')
        ? maybeSeedActions(values, { asset, decimals })
        : [];
    return assembleBundle('octant-vault-create-yearn', values, create, splitter, seed);
  },

  decode(actions, cursor) {
    const match = matchVaultCreateBundle(actions, cursor, FACTORY, YEARN_CREATE_SIG);
    if (!match) return null;

    const create = actions[match.createIdx];
    const decoded = decodeAbiParameters(
      parseAbiParameters(
        'address, address, string, string, address, address, address, address, bool, address',
      ),
      (create.calldata.startsWith('0x') ? create.calldata : `0x${create.calldata}`) as `0x${string}`,
    ) as readonly [Address, Address, string, string, Address, Address, Address, Address, boolean, Address];

    const values: YearnVaultCreateFields = {
      yearnVault: decoded[0],
      asset: decoded[1],
      vaultName: decoded[2],
      vaultSymbol: decoded[3],
      management: decoded[4],
      keeper: decoded[5],
      emergencyAdmin: decoded[6],
      donationAddress: decoded[7],
      enableBurning: decoded[8] ? 'true' : 'false',
      tokenizedStrategyAddress: decoded[9],
    };

    if (match.splitter) {
      values.newSplitterPayload = stringifyNewSplitterPayload(
        match.splitter,
        decoded[7],
      );
    }
    if (match.seed) {
      // We don't know decimals from calldata alone — keep the legacy default
      // of 18 and let the editor's seedAssetDecimals override on re-edit.
      const decimals = 18;
      values.seedAmount = formatSeedAmount(match.seed.amount, decimals);
      values.predictedVault = match.seed.predictedVault;
      values.seedAssetDecimals = String(decimals);
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
      title: `Create Octant Yearn vault "${values.vaultName}"`,
      description: `wrapping Yearn vault ${values.yearnVault}`,
      functionName: 'createStrategy',
      params: { name: values.vaultName, symbol: values.vaultSymbol },
    });
    if (values.seedAmount && parseFloat(values.seedAmount) > 0) {
      descriptions.push({
        title: `Approve ${values.seedAmount} (underlying asset)`,
        description: 'for the new vault',
        functionName: 'approve',
      });
      descriptions.push({
        title: `Seed vault with ${values.seedAmount}`,
        functionName: 'deposit',
      });
    }
    return descriptions;
  },
};
