# ADR 0010: Local JSON file for the ledger (showcase)

- Status: Accepted
- Date: 2026-10-13

## Context

The first version kept the ledger in memory. A server restart deleted all transactions. A showcase needs data that stays after a restart, and realistic sample data.

## Decision

1. Keep the ledger in `apps/server/data/ledger.json`. Copy `seed.json` (13 sample transactions) at the first start.
2. Hide the storage behind a `LedgerRepository` interface (`load`, `save`).
3. Validate the file with a Zod schema at each read.
4. Replay all transactions at start-up and check each `balanceAfter` (integrity check).
5. Write atomically (temporary file, then rename). Save before the in-memory state changes.

## Alternatives

- SQLite: correct for production, but the data file is not readable in a text editor.
- In memory only: no persistence.

## Consequences

- A reviewer can open `ledger.json` and see the data and the trace IDs.
- One process only: the file has no lock for many server instances.
- No encryption: the file is for a local showcase only (warning in docs/DATA-STORAGE.md).
