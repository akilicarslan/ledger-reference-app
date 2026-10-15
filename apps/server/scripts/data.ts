/**
 * Showcase data commands.
 *
 *   tsx scripts/data.ts seed    writes data/seed.json (deterministic, committed to git)
 *   tsx scripts/data.ts reset   deletes data/ledger.json and data/traces.jsonl.
 *                               The next server start copies seed.json again.
 */
import { createHash } from 'node:crypto';
import { rmSync } from 'node:fs';
import { join } from 'node:path';
import { DEFAULT_DATA_DIR } from '../src/config';
import { Ledger } from '../src/domain/ledger';
import { InMemoryLedgerRepository, JsonFileLedgerRepository } from '../src/store/ledgerRepository';

interface SeedEntry {
  date: string;
  type: 'credit' | 'debit';
  amount: number;
  title: string;
  description: string;
}

/** Two months of a small practice: salary, rent, medical and office costs. */
const ENTRIES: SeedEntry[] = [
  {
    date: '2026-09-01T08:30:00.000Z',
    type: 'credit',
    amount: 4200,
    title: 'Salary (September)',
    description: 'Monthly salary',
  },
  {
    date: '2026-09-02T10:05:00.000Z',
    type: 'debit',
    amount: 1450,
    title: 'Rent',
    description: 'Office rent, September',
  },
  {
    date: '2026-09-05T16:42:00.000Z',
    type: 'debit',
    amount: 86.4,
    title: 'Pharmacy',
    description: 'Prescription and vitamins',
  },
  {
    date: '2026-09-09T12:15:00.000Z',
    type: 'debit',
    amount: 64.2,
    title: 'Office supplies',
    description: 'Printer paper and toner',
  },
  {
    date: '2026-09-14T09:00:00.000Z',
    type: 'credit',
    amount: 350,
    title: 'Consulting invoice 1042',
    description: 'Payment from Acme Health',
  },
  {
    date: '2026-09-18T14:30:00.000Z',
    type: 'debit',
    amount: 129.99,
    title: 'Software subscription',
    description: 'Annual plan, accounting tool',
  },
  {
    date: '2026-09-23T18:10:00.000Z',
    type: 'debit',
    amount: 200,
    title: 'Cash withdrawal',
    description: 'ATM, Main Street',
  },
  {
    date: '2026-09-28T13:05:00.000Z',
    type: 'debit',
    amount: 42.75,
    title: 'Team lunch',
    description: '',
  },
  {
    date: '2026-10-01T08:30:00.000Z',
    type: 'credit',
    amount: 4200,
    title: 'Salary (October)',
    description: 'Monthly salary',
  },
  {
    date: '2026-10-02T10:02:00.000Z',
    type: 'debit',
    amount: 1450,
    title: 'Rent',
    description: 'Office rent, October',
  },
  {
    date: '2026-10-06T11:20:00.000Z',
    type: 'debit',
    amount: 310,
    title: 'Medical equipment',
    description: 'Blood pressure monitor',
  },
  {
    date: '2026-10-10T15:45:00.000Z',
    type: 'debit',
    amount: 58.3,
    title: 'Internet',
    description: 'Fiber connection, October',
  },
  {
    date: '2026-10-12T17:25:00.000Z',
    type: 'credit',
    amount: 120.5,
    title: 'Refund',
    description: 'Returned keyboard',
  },
];

/** Deterministic hex from a label, so `seed` writes the same file each time. */
const hex = (label: string, length: number) =>
  createHash('sha256').update(label).digest('hex').slice(0, length);

function writeSeed(): void {
  const repository = new InMemoryLedgerRepository();
  let index = 0;
  let clock = new Date(ENTRIES[0]!.date);
  const ledger = new Ledger({
    repository,
    now: () => clock,
    newId: () => {
      const h = hex(`seed-transaction-${index}`, 32);
      // UUID version 4 layout, so the id passes `z.uuid()`.
      return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`;
    },
  });
  for (const entry of ENTRIES) {
    clock = new Date(entry.date);
    ledger.record(
      {
        type: entry.type,
        amount: entry.amount,
        title: entry.title,
        description: entry.description,
        dateTime: entry.date,
      },
      { traceId: hex(`seed-trace-${index}`, 32) },
    );
    index += 1;
  }
  const data = repository.load();
  if (!data) throw new Error('The seed ledger is empty.');
  const target = join(DEFAULT_DATA_DIR, 'seed.json');
  new JsonFileLedgerRepository(target).save(data);
  console.log(
    `Wrote ${data.transactions.length} transactions to ${target}. Balance: ${ledger.getBalance().amount} USD.`,
  );
}

function reset(): void {
  for (const name of ['ledger.json', 'traces.jsonl']) {
    rmSync(join(DEFAULT_DATA_DIR, name), { force: true });
  }
  console.log('Deleted ledger.json and traces.jsonl. The next server start copies seed.json.');
}

const command = process.argv[2];
if (command === 'seed') writeSeed();
else if (command === 'reset') reset();
else {
  console.error('Usage: tsx scripts/data.ts <seed|reset>');
  process.exit(2);
}
