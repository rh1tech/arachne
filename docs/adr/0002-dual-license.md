# ADR 0002: Dual license MIT OR Apache-2.0

- **Status:** Accepted
- **Date:** 2026-09-27
- **Deciders:** Arachne core

## Context

We want maximum adoption (MIT familiarity) while retaining the patent grant
that Apache-2.0 provides for corporate contributors.

## Decision

Ship under **MIT OR Apache-2.0** (SPDX). Recipients may choose either license.
Both `LICENSE-MIT` and `LICENSE-APACHE` live at the repo root. Every package
`package.json` sets `"license": "MIT OR Apache-2.0"`.

## Alternatives considered

1. **MIT only** — simpler, no patent grant.
2. **Apache-2.0 only** — patent grant, less familiar for some JS projects.

## Consequences

- Contributors retain patent protection under Apache-2.0 terms.
- Downstream users who prefer MIT may take that path.
