/**
 * safeAll — Promise.allSettled with named slots and graceful empty defaults.
 *
 * Use when running a fan-out of independent queries where one failure
 * shouldn't tank the rest of the response. Each rejected query logs a
 * warning and its slot defaults to `[]`.
 *
 * Designed for the activity feed (`app/api/activity/route.ts`) but generic
 * enough to reuse anywhere a `Promise.all` of independent queries lives.
 *
 * Example:
 *   const data = await safeAll('activity', {
 *     votes: sql\`SELECT ...\`,
 *     proposals: sql\`SELECT ...\`,
 *   });
 *   // data.votes is the rows array, OR [] if the query rejected.
 *   // data._failedProducers is set in dev only.
 */

// postgres-js `PendingQuery` resolves to a `readonly` RowList, not a mutable
// array. Accept `readonly unknown[]` so the helper works for both plain
// promises of arrays AND postgres template results without coercion at call
// sites.
type ArrayLikeThenable<T extends readonly unknown[] = readonly unknown[]> = PromiseLike<T>;

type Resolved<T> = T extends ArrayLikeThenable<infer R> ? R : T;

export type SafeAllResult<T extends Record<string, ArrayLikeThenable>> = {
  [K in keyof T]: Resolved<T[K]>;
} & {
  /**
   * In non-production builds, the list of producer keys whose query
   * rejected. Stripped from production responses so we don't leak query
   * names to clients.
   */
  _failedProducers?: string[];
};

/**
 * Run each query under `Promise.allSettled` semantics. Resolved queries pass
 * through. Rejected queries log a warning and default to an empty array.
 *
 * @param namespace Short label for log lines (e.g. "activity"). Helps
 *                  distinguish which feed failed when multiple routes use
 *                  this helper.
 * @param queries   Object whose values are thenables yielding arrays.
 *                  Typically `postgres.PendingQuery` from `sql\`\``.
 * @returns         Object with the same keys, each holding the resolved
 *                  array or `[]`. In dev, includes `_failedProducers`.
 */
export async function safeAll<T extends Record<string, ArrayLikeThenable>>(
  namespace: string,
  queries: T,
): Promise<SafeAllResult<T>> {
  const keys = Object.keys(queries) as (keyof T)[];
  const results = await Promise.allSettled(keys.map((k) => queries[k]));

  const out = {} as SafeAllResult<T>;
  const failed: string[] = [];

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const result = results[i];
    if (result.status === 'fulfilled') {
      (out as Record<string, unknown>)[key as string] = result.value;
    } else {
      // Warn, not error: missing tables during an indexer redeploy are
      // expected for a few minutes. A producer failing for hours is the
      // operational red flag — wire alerting on the warning string.
      console.warn(
        `[${namespace}] producer "${String(key)}" failed: ${
          result.reason instanceof Error ? result.reason.message : String(result.reason)
        }`,
      );
      (out as Record<string, unknown>)[key as string] = [];
      failed.push(String(key));
    }
  }

  if (process.env.NODE_ENV !== 'production' && failed.length > 0) {
    out._failedProducers = failed;
  }

  return out;
}
