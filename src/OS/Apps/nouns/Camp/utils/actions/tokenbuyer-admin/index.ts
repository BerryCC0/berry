/**
 * tokenbuyer-admin — TokenBuyer parameter setters.
 */

import { type Address } from 'viem';
import { TOKEN_BUYER_ADDRESS } from '../../actionTemplates/constants';
import {
  makeAddressAction,
  makeNoArgAction,
  makeUintAction,
} from '../shared/factories';

const TARGET = TOKEN_BUYER_ADDRESS as Address;

export const adminTokenbuyerBaseline = makeUintAction({
  id: 'admin-tokenbuyer-baseline',
  name: 'Set Baseline Payment Token Amount',
  description: 'Target USDC reserve the TokenBuyer maintains for the Payer',
  category: 'tokenbuyer-admin',
  target: TARGET,
  signature: 'setBaselinePaymentTokenAmount(uint256)',
  field: { name: 'amount', label: 'Amount (USDC)' },
  width: 'uint256',
  decimals: 6,
});

export const adminTokenbuyerDiscount = makeUintAction({
  id: 'admin-tokenbuyer-discount',
  name: 'Set Bot Discount (BPS)',
  description: 'Discount given to arbitrage bots refilling the TokenBuyer',
  category: 'tokenbuyer-admin',
  target: TARGET,
  signature: 'setBotDiscountBPs(uint16)',
  field: { name: 'bps', label: 'BPS' },
  width: 'uint16',
});

export const adminTokenbuyerPause = makeNoArgAction({
  id: 'admin-tokenbuyer-pause',
  name: 'Pause TokenBuyer',
  description: 'Stop the TokenBuyer from accepting refills',
  category: 'tokenbuyer-admin',
  target: TARGET,
  signature: 'pause()',
});

export const adminTokenbuyerUnpause = makeNoArgAction({
  id: 'admin-tokenbuyer-unpause',
  name: 'Unpause TokenBuyer',
  description: 'Resume the TokenBuyer',
  category: 'tokenbuyer-admin',
  target: TARGET,
  signature: 'unpause()',
});

export const adminTokenbuyerWithdrawEth = makeNoArgAction({
  id: 'admin-tokenbuyer-withdraw-eth',
  name: 'Withdraw ETH from TokenBuyer',
  description: 'Sweep ETH held by the TokenBuyer back to the treasury',
  category: 'tokenbuyer-admin',
  target: TARGET,
  signature: 'withdrawETH()',
});

export const adminTokenbuyerAdmin = makeAddressAction({
  id: 'admin-tokenbuyer-admin',
  name: 'Set TokenBuyer Admin',
  description: 'Admin address with operational control of the TokenBuyer',
  category: 'tokenbuyer-admin',
  target: TARGET,
  signature: 'setAdmin(address)',
  field: { name: 'address', label: 'Admin' },
});

export const adminTokenbuyerPriceFeed = makeAddressAction({
  id: 'admin-tokenbuyer-price-feed',
  name: 'Set Price Feed',
  description: 'Oracle the TokenBuyer uses to price ETH ↔ USDC',
  category: 'tokenbuyer-admin',
  target: TARGET,
  signature: 'setPriceFeed(address)',
  field: { name: 'address', label: 'Price Feed' },
});

export const adminTokenbuyerPayer = makeAddressAction({
  id: 'admin-tokenbuyer-payer',
  name: 'Set Payer',
  description: 'Payer contract the TokenBuyer forwards USDC to',
  category: 'tokenbuyer-admin',
  target: TARGET,
  signature: 'setPayer(address)',
  field: { name: 'address', label: 'Payer' },
});

export const adminTokenbuyerTransferOwnership = makeAddressAction({
  id: 'admin-tokenbuyer-transfer-ownership',
  name: 'Transfer TokenBuyer Ownership',
  description: 'Move ownership of the TokenBuyer contract',
  category: 'tokenbuyer-admin',
  target: TARGET,
  signature: 'transferOwnership(address)',
  field: { name: 'address', label: 'New Owner' },
});

export const adminTokenbuyerMaxBaseline = makeUintAction({
  id: 'admin-tokenbuyer-max-baseline',
  name: 'Set Max Admin Baseline',
  description: 'Upper bound the admin can set for baseline payment token amount',
  category: 'tokenbuyer-admin',
  target: TARGET,
  signature: 'setMaxAdminBaselinePaymentTokenAmount(uint256)',
  field: { name: 'amount', label: 'Amount (USDC)' },
  width: 'uint256',
  decimals: 6,
});

export const adminTokenbuyerMinBaseline = makeUintAction({
  id: 'admin-tokenbuyer-min-baseline',
  name: 'Set Min Admin Baseline',
  description: 'Lower bound the admin can set for baseline payment token amount',
  category: 'tokenbuyer-admin',
  target: TARGET,
  signature: 'setMinAdminBaselinePaymentTokenAmount(uint256)',
  field: { name: 'amount', label: 'Amount (USDC)' },
  width: 'uint256',
  decimals: 6,
});

export const adminTokenbuyerMaxDiscount = makeUintAction({
  id: 'admin-tokenbuyer-max-discount',
  name: 'Set Max Admin Discount (BPS)',
  description: 'Upper bound for the bot discount the admin can set',
  category: 'tokenbuyer-admin',
  target: TARGET,
  signature: 'setMaxAdminBotDiscountBPs(uint16)',
  field: { name: 'bps', label: 'BPS' },
  width: 'uint16',
});

export const adminTokenbuyerMinDiscount = makeUintAction({
  id: 'admin-tokenbuyer-min-discount',
  name: 'Set Min Admin Discount (BPS)',
  description: 'Lower bound for the bot discount the admin can set',
  category: 'tokenbuyer-admin',
  target: TARGET,
  signature: 'setMinAdminBotDiscountBPs(uint16)',
  field: { name: 'bps', label: 'BPS' },
  width: 'uint16',
});
