#!/usr/bin/env node
/**
 * Backfill progress logger.
 *
 * Runs alongside `ponder start` in the same container. Polls Ponder's
 * /metrics endpoint every 30s and logs one line per 5% backfill milestone.
 * Replaces the firehose of per-batch INFO logs with a handful of well-spaced
 * progress markers that don't trip Railway's log rate limit.
 *
 * Output shape:
 *   [progress] Pinger started — will log at 5% increments
 *   [progress] Backfill started — 12,167,104 blocks to sync
 *   [progress] Backfill 5% — 608,355 / 12,167,104 blocks · 1,200 blk/s · ETA ~2h 5m
 *   [progress] Backfill 10% — ...
 *   [progress] Backfill complete (95 min)
 *
 * Why a separate process: Ponder's built-in progress logging is all-or-nothing
 * (the INFO log level enables it and floods Railway). This script reads the
 * same metrics Ponder already publishes and emits its own summary line.
 */

import { setTimeout } from "node:timers/promises";

const PORT = process.env.PORT || "42069";
const METRICS_URL = `http://localhost:${PORT}/metrics`;
const POLL_MS = 30_000;
const MILESTONE_STEP = 5; // log every 5% of completion

const STARTED_AT = Date.now();
let lastMilestone = -1;
let lastCompleted = 0;
let lastCompletedAt = STARTED_AT;
let announcedStart = false;

function sumMetric(metricsText, name) {
  let total = 0;
  for (const line of metricsText.split("\n")) {
    if (!line.startsWith(name)) continue;
    const m = line.match(/\s(-?[\d.]+)\s*$/);
    if (m) total += Number(m[1]);
  }
  return total;
}

function fmtNumber(n) {
  return Math.round(n).toLocaleString();
}

function fmtETA(percent, blocksPerSec, totalBlocks, completedBlocks) {
  // ETA stays unstable until we have a real rate sample. Show a placeholder
  // until then to avoid the 181-hour-at-0% confusion.
  if (percent < MILESTONE_STEP || !blocksPerSec || blocksPerSec === "?") {
    return "calculating…";
  }
  const remaining = totalBlocks - completedBlocks;
  const seconds = remaining / Number(blocksPerSec);
  const min = Math.round(seconds / 60);
  if (min < 1) return "<1 min";
  if (min < 60) return `~${min} min`;
  const hours = Math.floor(min / 60);
  const rem = min % 60;
  return `~${hours}h ${rem}m`;
}

async function poll() {
  let res;
  try {
    res = await fetch(METRICS_URL);
  } catch {
    return; // ponder not listening yet
  }
  if (!res.ok) return;

  const text = await res.text();
  const completed = sumMetric(text, "ponder_historical_completed_blocks");
  const total = sumMetric(text, "ponder_historical_total_blocks");

  if (total === 0) return;

  if (!announcedStart) {
    console.log(`[progress] Backfill started — ${fmtNumber(total)} blocks to sync`);
    announcedStart = true;
    lastCompleted = completed;
    lastCompletedAt = Date.now();
  }

  const percent = (completed / total) * 100;
  const milestone = Math.floor(percent / MILESTONE_STEP) * MILESTONE_STEP;

  // Skip the 0% milestone — ETA + rate are meaningless before we have data.
  if (milestone >= MILESTONE_STEP && milestone > lastMilestone && milestone <= 100) {
    const now = Date.now();
    const deltaMs = now - lastCompletedAt;
    const deltaBlocks = completed - lastCompleted;
    const blocksPerSec =
      deltaMs > 0 && deltaBlocks > 0
        ? (deltaBlocks / (deltaMs / 1000)).toFixed(0)
        : "?";

    console.log(
      `[progress] Backfill ${milestone}% — ${fmtNumber(completed)} / ${fmtNumber(total)} blocks · ${blocksPerSec} blk/s · ETA ${fmtETA(percent, blocksPerSec, total, completed)}`,
    );

    lastMilestone = milestone;
    lastCompleted = completed;
    lastCompletedAt = now;
  }

  if (percent >= 100 && lastMilestone < 100) {
    const elapsedMin = Math.round((Date.now() - STARTED_AT) / 60_000);
    console.log(`[progress] Backfill complete (${elapsedMin} min)`);
    lastMilestone = 100;
  }
}

console.log(
  `[progress] Pinger started — will log at ${MILESTONE_STEP}% increments`,
);

while (true) {
  await poll();
  await setTimeout(POLL_MS);
}
