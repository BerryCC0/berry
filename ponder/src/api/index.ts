/**
 * Ponder HTTP API
 *
 * Ponder v0.16+ requires an api/index.ts to exist; without it the HTTP server
 * never starts and Railway's healthcheck times out. This file is the minimum
 * needed to boot that server.
 *
 * The Berry OS frontend reads on-chain data via direct SQL queries against
 * ponder_live.* (see app/lib/ponder-db.ts), so no REST endpoints are exposed
 * here. The /graphql route is kept as a convenience for ad-hoc querying
 * (referenced from CLAUDE.md as berryos.up.railway.app/graphql).
 *
 * Liveness/readiness probes are served by Ponder internally — do not add a
 * manual /ready route (commit 32301133 removed one for exactly that reason).
 */

import { Hono } from "hono";
import { db } from "ponder:api";
import schema from "ponder:schema";
import { graphql } from "ponder";

const app = new Hono();

app.use("/graphql", graphql({ db, schema }));

export default app;
