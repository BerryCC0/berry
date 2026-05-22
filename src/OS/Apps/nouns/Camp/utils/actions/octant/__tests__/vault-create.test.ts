/**
 * Round-trip tests for the vault-create-* variants, covering each bundle
 * length: bare create (1 action), create+seed (3), splitter+create (2),
 * splitter+create+seed (4).
 */

import { describe, it, expect } from 'vitest';
import { octantVaultCreateLido } from '../vault-create-lido';
import { octantVaultCreateMorpho } from '../vault-create-morpho';
import { octantVaultCreateSky } from '../vault-create-sky';
import { octantVaultCreateYearn } from '../vault-create-yearn';
import { assertRoundTrip, emptyEncodeContext } from '../../__tests__/roundTrip';

const KEEPER = '0x1111111111111111111111111111111111111111';
const DONATION = '0x2222222222222222222222222222222222222222';
const PREDICTED = '0x3333333333333333333333333333333333333333';
const IMPL = '0x4444444444444444444444444444444444444444';

const baseFields = {
  vaultName: 'Test Vault',
  vaultSymbol: 'tVAULT',
  management: '',
  keeper: KEEPER,
  emergencyAdmin: '',
  donationAddress: DONATION,
  enableBurning: 'true',
  tokenizedStrategyAddress: IMPL,
};

describe('octantVaultCreateLido', () => {
  it('emits a single createStrategy when no extras', () => {
    const actions = octantVaultCreateLido.encode(baseFields, emptyEncodeContext());
    expect(actions).toHaveLength(1);
    expect(actions[0].signature).toBe(
      'createStrategy(string,string,address,address,address,address,bool,address)',
    );
  });

  it('round-trips bare create', () => {
    assertRoundTrip(octantVaultCreateLido, baseFields);
  });

  it('round-trips create+seed (3 actions)', () => {
    assertRoundTrip(octantVaultCreateLido, {
      ...baseFields,
      seedAmount: '5',
      predictedVault: PREDICTED,
    });
  });

  it('round-trips splitter+create (2 actions)', () => {
    const splitterPayload = JSON.stringify({
      payees: [KEEPER, DONATION],
      names: ['Alice', 'Bob'],
      shares: ['50', '50'],
      predicted: DONATION, // splitter address = donationAddress by construction
    });
    assertRoundTrip(octantVaultCreateLido, {
      ...baseFields,
      newSplitterPayload: splitterPayload,
    });
  });

  it('round-trips splitter+create+seed (4 actions)', () => {
    const splitterPayload = JSON.stringify({
      payees: [KEEPER, DONATION],
      names: ['Alice', 'Bob'],
      shares: ['70', '30'],
      predicted: DONATION,
    });
    assertRoundTrip(octantVaultCreateLido, {
      ...baseFields,
      newSplitterPayload: splitterPayload,
      seedAmount: '2.5',
      predictedVault: PREDICTED,
    });
  });
});

describe('octantVaultCreateMorpho', () => {
  it('round-trips create+seed with 6-decimal USDC seed amount', () => {
    assertRoundTrip(octantVaultCreateMorpho, {
      ...baseFields,
      seedAmount: '1000.5',
      predictedVault: PREDICTED,
    });
  });
});

describe('octantVaultCreateSky', () => {
  it('round-trips bare create', () => {
    assertRoundTrip(octantVaultCreateSky, baseFields);
  });
});

describe('octantVaultCreateYearn', () => {
  const YEARN_VAULT = '0x5555555555555555555555555555555555555555';
  const ASSET = '0x6666666666666666666666666666666666666666';

  it('emits 10-arg createStrategy with yearnVault + asset prepended', () => {
    const actions = octantVaultCreateYearn.encode(
      { ...baseFields, yearnVault: YEARN_VAULT, asset: ASSET },
      emptyEncodeContext(),
    );
    expect(actions).toHaveLength(1);
    expect(actions[0].signature).toBe(
      'createStrategy(address,address,string,string,address,address,address,address,bool,address)',
    );
  });

  it('round-trips bare create', () => {
    assertRoundTrip(octantVaultCreateYearn, {
      ...baseFields,
      yearnVault: YEARN_VAULT,
      asset: ASSET,
    });
  });

  it('round-trips create+seed', () => {
    assertRoundTrip(octantVaultCreateYearn, {
      ...baseFields,
      yearnVault: YEARN_VAULT,
      asset: ASSET,
      seedAmount: '3.14',
      predictedVault: PREDICTED,
      seedAssetDecimals: '18',
    });
  });
});

describe('registry ordering — vault-create vs splitter-create', () => {
  // If the lido vault-create bundle is properly registered before the
  // standalone splitter-create matcher, a 2-action [splitter, create] bundle
  // should be claimed as ONE vault-create-lido aggregate (not split into a
  // splitter-create + bare-create pair).
  it('vault-create-lido claims [splitter, create] as one aggregate', () => {
    const splitterPayload = JSON.stringify({
      payees: [DONATION],
      names: ['Solo'],
      shares: ['100'],
      predicted: DONATION,
    });
    const actions = octantVaultCreateLido.encode(
      { ...baseFields, newSplitterPayload: splitterPayload },
      emptyEncodeContext(),
    );
    expect(actions).toHaveLength(2);
    // Re-decode and confirm both actions are consumed by ONE def.
    const ctx = {
      streamAddresses: new Set<string>(),
      cancelledStreams: new Set<string>(),
      streams: new Map(),
      tokens: new Map(),
    };
    const match = octantVaultCreateLido.decode(actions, 0, ctx);
    expect(match).not.toBeNull();
    expect(match?.consumed).toBe(2);
  });
});
