import { z } from 'zod';
import { randomHex } from './trace';

/**
 * Safe retries for writes (IETF draft "The Idempotency-Key HTTP Header Field").
 *
 * - The client creates one key for one transaction that the user wants to record.
 * - The client sends the same key again when it retries the same request
 *   (for example after a timeout, when the client cannot know if the server
 *   recorded the transaction).
 * - When the server already has a transaction with this key and the same data,
 *   it does not record a second transaction. It sends the stored transaction
 *   and the header `idempotent-replayed: true`.
 * - When the key is known but the data is different, the server refuses the
 *   request with the code `IDEMPOTENCY_KEY_REUSED`.
 */

export const IDEMPOTENCY_KEY_HEADER = 'idempotency-key';
export const IDEMPOTENT_REPLAYED_HEADER = 'idempotent-replayed';

export const IdempotencyKey = z.uuid({ version: 'v4' }).meta({
  id: 'IdempotencyKey',
  description:
    'UUID v4 that identifies one write. Send the same key again to retry the same write safely.',
  example: '6f1c2a3e-8b4d-4f0a-9c1e-2d3b4a5c6d7e',
});

/** Random UUID v4 (RFC 9562). */
export function newIdempotencyKey(): string {
  const hex = randomHex(16).split('');
  hex[12] = '4'; // version 4
  hex[16] = ((parseInt(hex[16] ?? '0', 16) & 0x3) | 0x8).toString(16); // variant 10xx
  const value = hex.join('');
  return `${value.slice(0, 8)}-${value.slice(8, 12)}-${value.slice(12, 16)}-${value.slice(16, 20)}-${value.slice(20)}`;
}
