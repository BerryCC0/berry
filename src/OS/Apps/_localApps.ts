/**
 * Local-only app registrations.
 *
 * This file is TRACKED but ships EMPTY. It exists so OSAppConfig.ts can
 * statically import a known location, and so apps that aren't ready for
 * production can be wired up locally without ever entering a commit.
 *
 * To run a local-only app (e.g. an in-progress app whose source files are
 * gitignored), populate the arrays below with its lazy import + config,
 * then run ONCE:
 *
 *   git update-index --skip-worktree src/OS/Apps/_localApps.ts
 *
 * That tells git to pretend this file is unchanged on your machine, so it
 * can't be staged or pushed. To start tracking changes again later:
 *
 *   git update-index --no-skip-worktree src/OS/Apps/_localApps.ts
 *
 * Icons for local-only apps should be referenced by raw path (e.g.
 * "/icons/food-nouns.svg") rather than added to IconRegistry, since that
 * file is tracked.
 */

import type { AppConfig } from "@/OS/types/app";

export const localAppConfigs: AppConfig[] = [];
