import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

/** apps/server/data */
export const DEFAULT_DATA_DIR = fileURLToPath(new URL('../data/', import.meta.url));

const filePath = (fallback: string) =>
  z
    .string()
    .default(fallback)
    .transform((value) => resolve(value));

const booleanFromEnv = z
  .enum(['true', 'false', '1', '0'])
  .transform((value) => value === 'true' || value === '1');

/**
 * Server settings from environment variables. Zod validates the values at
 * start-up, so a bad value stops the server with a clear message.
 */
const ConfigSchema = z
  .object({
    PORT: z.coerce.number().int().min(1).max(65535).default(4000),
    HOST: z.string().default('0.0.0.0'),
    PUBLIC_URL: z.url().optional(),
    /** Probability (0 to 1) that a stock request fails. */
    CHAOS_FAILURE_RATE: z.coerce.number().min(0).max(1).default(0.3),
    CHAOS_MIN_LATENCY_MS: z.coerce.number().int().min(0).default(150),
    CHAOS_MAX_LATENCY_MS: z.coerce.number().int().min(0).default(2500),
    /** The ledger data (JSON). The server writes it after each recorded transaction. */
    DATA_FILE: filePath(`${DEFAULT_DATA_DIR}ledger.json`),
    /** Showcase data that the server copies to DATA_FILE at the first start. */
    SEED_FILE: filePath(`${DEFAULT_DATA_DIR}seed.json`),
    /** Copy SEED_FILE when DATA_FILE does not exist. Set false for an empty ledger (e2e tests). */
    SEED_ON_FIRST_START: booleanFromEnv.default(true),
    /** Request trace events (JSON Lines). Set it to an empty value to keep traces in memory only. */
    TRACE_FILE: z
      .string()
      .default(`${DEFAULT_DATA_DIR}traces.jsonl`)
      .transform((value) => (value ? resolve(value) : undefined)),
    /** Opening balance in USD when the server starts with no data and no seed. */
    INITIAL_BALANCE: z.coerce.number().min(0).default(0),
    LOG_REQUESTS: booleanFromEnv.default(true),
  })
  .refine((config) => config.CHAOS_MAX_LATENCY_MS >= config.CHAOS_MIN_LATENCY_MS, {
    message: 'CHAOS_MAX_LATENCY_MS must be equal to or more than CHAOS_MIN_LATENCY_MS.',
    path: ['CHAOS_MAX_LATENCY_MS'],
  });

export type ServerConfig = z.infer<typeof ConfigSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): ServerConfig {
  const result = ConfigSchema.safeParse(env);
  if (!result.success) {
    throw new Error(`Invalid server configuration:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}
