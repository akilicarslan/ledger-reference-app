# Data storage (local JSON file)

For this showcase, the server keeps the ledger in one local JSON file.
This document describes the files, the rules that keep the data correct, and the commands.

## 1. Files

All files are in `apps/server/data/`.

| File           | In git | Content                                                                                                                 |
| -------------- | ------ | ----------------------------------------------------------------------------------------------------------------------- |
| `seed.json`    | Yes    | Showcase data: 13 transactions from September and October 2026 (salary, rent, medical and office costs).                |
| `ledger.json`  | No     | The live data. The server creates it from `seed.json` at the first start and writes it after each recorded transaction. |
| `traces.jsonl` | No     | The request trace log. One JSON line per server step. See [TRACING.md](TRACING.md).                                     |

## 2. Format of `ledger.json`

```json
{
  "version": 1,
  "currency": "USD",
  "openingBalanceCents": 0,
  "updatedAt": "2026-10-12T17:25:00.000Z",
  "transactions": [
    {
      "id": "639d0b04-4e62-4a1d-8e79-ee5d68fc8cea",
      "type": "credit",
      "amount": 4200,
      "title": "Salary (September)",
      "description": "Monthly salary",
      "dateTime": "2026-09-01T08:30:00.000Z",
      "receiptImage": null,
      "balanceAfter": 4200,
      "traceId": "655820badf23ad8994ba95023f1ed4d3"
    }
  ]
}
```

The `LedgerFile` Zod schema (`apps/server/src/store/ledgerRepository.ts`) defines this format.
Each transaction uses the same `Transaction` schema as the API.

## 3. Rules that keep the data correct

| Rule                                        | How                                                                                                                                                                        |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The file has the correct format.            | Zod parses the file at each read. A bad file stops the server with a clear message (`LedgerFileError`).                                                                    |
| The balances are correct.                   | At start-up, the ledger replays all transactions in integer cents. If one `balanceAfter` is wrong, or the balance goes below 0, the server stops (`LedgerIntegrityError`). |
| A crash cannot leave half a file.           | The server writes a temporary file, then renames it. A rename is atomic on one file system.                                                                                |
| A failed write does not change the balance. | The ledger saves first. It changes the in-memory state only after a successful save.                                                                                       |
| Two requests cannot write at the same time. | Node.js runs the ledger code on one thread and the write is synchronous.                                                                                                   |
| A refused transaction is not stored.        | The balance rule runs before the save.                                                                                                                                     |

## 4. Commands

```sh
pnpm --filter @ledger/server data:reset   # delete ledger.json and traces.jsonl; the next start copies seed.json
pnpm --filter @ledger/server data:seed    # write seed.json again from scripts/data.ts
```

## 5. Settings

| Variable              | Default                         | Effect                                                                      |
| --------------------- | ------------------------------- | --------------------------------------------------------------------------- |
| `DATA_FILE`           | `apps/server/data/ledger.json`  | The live data file.                                                         |
| `SEED_FILE`           | `apps/server/data/seed.json`    | The showcase data.                                                          |
| `SEED_ON_FIRST_START` | `true`                          | Copy the seed when `DATA_FILE` does not exist. The Detox tests set `false`. |
| `TRACE_FILE`          | `apps/server/data/traces.jsonl` | The trace log. An empty value keeps traces in memory only.                  |

## 6. Replace the file with a database

The ledger uses only the `LedgerRepository` interface (`load`, `save`).
To use a database, write a new class that implements this interface. The ledger rules do not change.

WARNING: The JSON file is for a local showcase only. It has no encryption and no access control. Do not keep real patient or financial data in it.
