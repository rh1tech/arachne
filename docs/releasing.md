# Releasing

The 21 public packages are published to npm as `@arachnejs/*`, all with the
same version (a Changesets *fixed* group). Private workspaces (the site, the
playground, the kit templates) are never published.

## Day to day

1. With a user-visible change, add a changeset and commit it with the change:

   ```bash
   bunx changeset          # pick packages and bump; any bump moves all of them
   ```

2. When CI passes on `master`, the **Release** workflow keeps a
   **"chore: version packages"** pull request up to date: versions and
   changelogs.
3. Merging that PR runs CI again; when it passes, Release runs
   `bun run release`, which publishes every `@arachnejs/*` version that isn't
   on npm yet, in dependency order, with provenance, and tags
   `<name>@<version>`.

`bun run release --dry-run` packs every package and runs
`npm publish --dry-run` locally; no npm login needed.

How a package is built for npm (`scripts/release.ts`): `bun pm pack`
replaces `workspace:*` with the real versions and applies `files` (tests
and fixtures stay out); the repository's `LICENSE-MIT` and `LICENSE-APACHE`
are copied in; `npm publish <tarball>` uploads it.

## Authentication

Publishing uses **npm trusted publishing** (OIDC); there is no npm token.
Each `@arachnejs/*` package on npmjs.com → Settings → Trusted publishing has
one GitHub Actions entry: organization `rh1tech`, repository `arachne`,
workflow `release.yml`, no environment, and **Allow `npm publish`** ticked
(without it only `npm stage publish` is allowed and a publish fails with
"OIDC permission denied for this action"). A new package needs its entry
before its first release; npm can't create one for a package that doesn't
exist yet, so publish it once by hand (`npm publish` after `npm login`).

The Release workflow requests `id-token: write`, runs on a GitHub-hosted
runner (trusted publishing doesn't accept self-hosted ones) and uses
npm ≥ 11.5.1. Repository → Settings → Actions → General allows GitHub
Actions to create pull requests (the version PR).

## Where CI runs

- **CI** (lint, typecheck, tests, browser e2e) runs on a self-hosted runner
  on rbx1 (`rbx1-arachne-ci`, labels `rbx1`, `arachne-ci`): user
  `arachne-ci` without sudo or docker, systemd service
  `actions.runner.rh1tech-arachne.rbx1-arachne-ci` with lower CPU/IO
  priority and `MemoryMax=8G` (drop-in `limits.conf`). Chromium's system
  libraries are installed on the host; the runner downloads Chromium itself.
- Pull requests from **forks** run on GitHub-hosted runners, never on rbx1,
  and outside contributors' workflows need a maintainer's approval.
- The **Release** publish job runs on GitHub-hosted runners: npm provenance
  and trusted publishing don't accept self-hosted runners.
- The **Site** workflow deploys arachne.rh1.tech from the rbx1 runner after
  CI passes on `master` (see `apps/site/README.md`).
