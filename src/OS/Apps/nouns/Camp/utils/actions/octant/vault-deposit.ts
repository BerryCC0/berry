/**
 * octant-vault-deposit — 2-action: approve(vault, amount) on the asset +
 * deposit(amount, treasury) on the vault. ERC-4626 standard deposit pattern.
 *
 * The vault address is whatever the editor entered (Octant deploys vaults
 * via CREATE2, so no fixed list). Receiver is always the treasury so vault
 * shares land in the treasury.
 */

import { type Address, encodeAbiParameters, parseAbiParameters, parseUnits } from 'viem';
import { NOUNS_ADDRESSES } from '@/app/lib/nouns';
import { COMMON_TOKENS } from '../../actionTemplates/constants';
import {
  addressEquals,
  decodeArgs,
  formatTokenAmount,
  matchSignature,
  multiActionId,
  parseTokenSelectValue,
  stringifyTokenSelectValue,
} from '../shared';
import type { TransactionActionDef } from '../types';

interface Fields {
  vault: string;
  token: string;
  amount: string;
}

const APPROVE_SIG = 'approve(address,uint256)';
const DEPOSIT_SIG = 'deposit(uint256,address)';
const TREASURY = NOUNS_ADDRESSES.treasury as Address;

export const octantVaultDeposit: TransactionActionDef<Fields> = {
  id: 'octant-vault-deposit',
  category: 'octant',
  name: 'Deposit to Octant Vault',
  description: "Deposit treasury assets into an Octant Dragon vault (ERC-4626)",
  isMultiAction: true,
  fields: [
    { name: 'vault', label: 'Vault Address', type: 'address', required: true },
    { name: 'token', label: 'Asset', type: 'token-select', required: true },
    { name: 'amount', label: 'Amount', type: 'amount', required: true },
  ],

  encode(values) {
    const token = parseTokenSelectValue(values.token, COMMON_TOKENS);
    if (!token) throw new Error('octant-vault-deposit: invalid token');
    const vault = values.vault as Address;
    const amount = parseUnits(values.amount || '0', token.decimals);
    const groupId = multiActionId('octant-vault-deposit', values);
    return [
      {
        target: token.address,
        value: '0',
        signature: APPROVE_SIG,
        calldata: encodeAbiParameters(parseAbiParameters('address, uint256'), [
          vault,
          amount,
        ]),
        isPartOfMultiAction: true,
        multiActionGroupId: groupId,
        multiActionIndex: 0,
      },
      {
        target: vault,
        value: '0',
        signature: DEPOSIT_SIG,
        calldata: encodeAbiParameters(parseAbiParameters('uint256, address'), [
          amount,
          TREASURY,
        ]),
        isPartOfMultiAction: true,
        multiActionGroupId: groupId,
        multiActionIndex: 1,
      },
    ];
  },

  decode(actions, cursor) {
    const approve = actions[cursor];
    const deposit = actions[cursor + 1];
    if (!approve || !deposit) return null;
    if (!matchSignature(approve, APPROVE_SIG)) return null;
    if (!matchSignature(deposit, DEPOSIT_SIG)) return null;

    const approveArgs = decodeArgs<readonly [Address, bigint]>(
      approve.calldata,
      'address, uint256',
    );
    if (!approveArgs) return null;
    const vault = approveArgs[0];

    // Deposit must target the same vault the approve authorised.
    if (!addressEquals(deposit.target, vault)) return null;

    const depositArgs = decodeArgs<readonly [bigint, Address]>(
      deposit.calldata,
      'uint256, address',
    );
    if (!depositArgs) return null;
    if (depositArgs[0] !== approveArgs[1]) return null;
    if (!addressEquals(depositArgs[1], TREASURY)) return null;

    const tokenAddress = approve.target as Address;
    const knownToken = COMMON_TOKENS.find((t) =>
      addressEquals(t.address, tokenAddress),
    );
    const decimals = knownToken?.decimals ?? 18;

    return {
      values: {
        vault: deposit.target,
        token: stringifyTokenSelectValue({
          symbol: knownToken?.symbol ?? tokenAddress,
          address: tokenAddress,
          decimals,
          isNative: false,
        }),
        amount: formatTokenAmount(depositArgs[0], decimals),
      },
      consumed: 2,
    };
  },

  describe(values) {
    const token = parseTokenSelectValue(values.token);
    return [
      {
        title: `Approve ${values.amount} ${token?.symbol ?? 'tokens'}`,
        description: 'for the Octant vault',
        functionName: 'approve',
      },
      {
        title: `Deposit ${values.amount} ${token?.symbol ?? 'tokens'} → Octant vault`,
        functionName: 'deposit',
      },
    ];
  },
};
