import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { z } from 'zod';
import { Currency, IsoDateTime, Transaction } from '@ledger/contracts';

/**
 * Persistence of the ledger.
 *
 * For this showcase the data is in one local JSON file. The domain code uses
 * only the `LedgerRepository` interface, so a database can replace the file
 * without a change to the ledger rules.
 */

/** Format of the data file. Zod checks the file each time the server reads it. */
export const LedgerFile = z.object({
  version: z.literal(1),
  currency: Currency,
  /** Balance before the first transaction, in integer cents. */
  openingBalanceCents: z.number().int().min(0),
  updatedAt: IsoDateTime,
  /** Oldest transaction first. */
  transactions: z.array(Transaction),
});

export type LedgerFile = z.infer<typeof LedgerFile>;

export interface LedgerRepository {
  /** Returns the stored ledger, or null when nothing is stored yet. */
  load(): LedgerFile | null;
  save(data: LedgerFile): void;
  /** A short text for the start-up log, for example the file path. */
  readonly description: string;
}

export class InMemoryLedgerRepository implements LedgerRepository {
  readonly description = 'memory (not persisted)';
  private data: LedgerFile | null;

  constructor(initial: LedgerFile | null = null) {
    this.data = initial ? structuredClone(initial) : null;
  }

  load(): LedgerFile | null {
    return this.data ? structuredClone(this.data) : null;
  }

  save(data: LedgerFile): void {
    this.data = structuredClone(data);
  }
}

export class LedgerFileError extends Error {
  constructor(filePath: string, reason: string) {
    super(`The data file ${filePath} is not valid: ${reason}`);
    this.name = 'LedgerFileError';
  }
}

/**
 * Reads and writes the ledger as pretty-printed JSON.
 *
 * Each save writes a temporary file, then renames it. A rename is atomic on
 * the same file system, so a crash during a write cannot leave half a file.
 * Node.js runs the ledger code on one thread and the write is synchronous,
 * so two requests cannot write at the same time.
 */
export class JsonFileLedgerRepository implements LedgerRepository {
  constructor(private readonly filePath: string) {}

  get description(): string {
    return this.filePath;
  }

  load(): LedgerFile | null {
    if (!existsSync(this.filePath)) return null;
    let raw: unknown;
    try {
      raw = JSON.parse(readFileSync(this.filePath, 'utf8'));
    } catch (error) {
      throw new LedgerFileError(
        this.filePath,
        error instanceof Error ? error.message : String(error),
      );
    }
    const parsed = LedgerFile.safeParse(raw);
    if (!parsed.success) throw new LedgerFileError(this.filePath, z.prettifyError(parsed.error));
    return parsed.data;
  }

  save(data: LedgerFile): void {
    mkdirSync(dirname(this.filePath), { recursive: true });
    const temporary = `${this.filePath}.${process.pid}.tmp`;
    writeFileSync(temporary, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
    renameSync(temporary, this.filePath);
  }
}
