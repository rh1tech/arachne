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

## One-time setup

1. On npmjs.com, signed in as the owner account, create the free
   organization **`arachnejs`** (Add Organization → Unlimited public packages).
2. Create a **granular access token**: Packages and scopes → Read and write
   → scope `@arachnejs`, organization `arachnejs`; allow publishing without
   2FA prompts ("bypass 2FA" for automation).
3. Store it as the repository secret `NPM_TOKEN`:

   ```bash
   gh secret set NPM_TOKEN --repo rh1tech/arachne
   ```

4. Repository → Settings → Actions → General: allow GitHub Actions to create
   pull requests (for the version PR).

## After the first release: trusted publishing

Once every package exists on npm, switch from the token to OIDC:

1. For each `@arachnejs/*` package on npmjs.com → Settings → Trusted
   publishing → GitHub Actions: repository `rh1tech/arachne`, workflow
   `release.yml`.
2. Optionally set "Require two-factor authentication and disallow tokens".
3. Delete the `NPM_TOKEN` secret and the token on npmjs.com.

The workflow already requests `id-token: write` and uses npm ≥ 11.5.1, so
no workflow change is needed.

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
