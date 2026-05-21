/**
 * Activity registry invariants.
 *
 * The module-load assertion in `orchestrator.ts` enforces the producer
 * ownership rules at app boot. These tests are the same rules expressed in
 * Vitest, plus a few structural checks that complement the TypeScript
 * `satisfies` guarantee on the registry.
 *
 * Why both runtime assertion AND test? The assertion catches breakage at
 * boot in any environment. The test catches breakage in CI before a deploy
 * even ships, and gives a friendlier error message in PR review.
 */

import { describe, it, expect } from 'vitest';
import { ACTIVITY_REGISTRY } from '../registry';
import { assertRegistryInvariants } from '../orchestrator';
import type { ActivityDefinition, ProducerKey } from '../types';

describe('ACTIVITY_REGISTRY', () => {
  it('every key has a definition', () => {
    // `satisfies Record<ActivityType, ActivityDefinition>` already enforces
    // this at compile time. The test catches the case where someone widens
    // the satisfies constraint or comments out an entry.
    for (const [key, def] of Object.entries(ACTIVITY_REGISTRY)) {
      expect(def, `key "${key}" has no definition`).toBeDefined();
    }
  });

  it('every definition.type matches its registry key', () => {
    // Catches copy-paste errors where a new definition's `type` field
    // doesn't match the key it was registered under.
    for (const [key, def] of Object.entries(ACTIVITY_REGISTRY)) {
      expect(def.type, `registered under "${key}" but def.type is "${def.type}"`).toBe(key);
    }
  });

  it('exactly one buildQuery owner per producerKey', () => {
    // Two defs both trying to fetch the same producer's rows would either
    // double-query the database OR silently drop the second. Either way:
    // wrong. The module-load assertion in orchestrator.ts catches this too.
    const owners = new Map<ProducerKey, string>();
    for (const def of Object.values(ACTIVITY_REGISTRY)) {
      if (!def.buildQuery) continue;
      const existing = owners.get(def.producerKey);
      expect(
        existing,
        `producer "${def.producerKey}" claimed by both "${existing}" and "${def.type}"`,
      ).toBeUndefined();
      owners.set(def.producerKey, def.type);
    }
  });

  it('every producerKey referenced by a def has a buildQuery owner', () => {
    // Otherwise that producer's rows are never fetched and every consumer
    // of those rows returns []. Silent feature outage.
    const owned = new Set(
      Object.values(ACTIVITY_REGISTRY)
        .filter((d) => d.buildQuery)
        .map((d) => d.producerKey),
    );
    const referenced = new Set(Object.values(ACTIVITY_REGISTRY).map((d) => d.producerKey));
    for (const producer of referenced) {
      expect(
        owned.has(producer),
        `producer "${producer}" referenced by a definition but no definition owns its buildQuery`,
      ).toBe(true);
    }
  });
});

describe('assertRegistryInvariants', () => {
  // Build a minimal valid def for assertion testing. We don't care about
  // row shape — the assertion only looks at `type`, `producerKey`, `buildQuery`.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function makeDef(over: Partial<ActivityDefinition>): ActivityDefinition<any> {
    return {
      type: 'vote',
      producerKey: 'votes',
      processRows: () => [],
      ...over,
    };
  }

  it('accepts the real registry', () => {
    expect(() =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      assertRegistryInvariants(ACTIVITY_REGISTRY as Record<string, ActivityDefinition<any>>),
    ).not.toThrow();
  });

  it('throws when two defs claim buildQuery for the same producer', () => {
    const bad = {
      a: makeDef({
        type: 'vote',
        producerKey: 'votes' as ProducerKey,
        buildQuery: () => 'q' as never,
      }),
      b: makeDef({
        type: 'proposal_feedback',
        producerKey: 'votes' as ProducerKey,
        buildQuery: () => 'q' as never,
      }),
    };
    expect(() => assertRegistryInvariants(bad)).toThrow(/two buildQuery owners/);
  });

  it('throws when a producerKey has no buildQuery owner', () => {
    const bad = {
      a: makeDef({
        type: 'vote',
        producerKey: 'votes' as ProducerKey,
        // no buildQuery — and nothing else owns 'votes' either
      }),
    };
    expect(() => assertRegistryInvariants(bad)).toThrow(/no buildQuery owner/);
  });
});
