import { existsSync } from 'node:fs';
import { JsonFileLedgerRepository, type LedgerRepository } from './ledgerRepository';

/**
 * Copies the showcase data into an empty repository.
 * Returns true when the seed was copied.
 */
export function seedIfEmpty(repository: LedgerRepository, seedFile: string): boolean {
  if (repository.load() !== null || !existsSync(seedFile)) return false;
  const seed = new JsonFileLedgerRepository(seedFile).load();
  if (!seed) return false;
  repository.save(seed);
  return true;
}
