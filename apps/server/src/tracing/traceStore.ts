import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { TraceEvent } from '@ledger/contracts';

export interface TraceStoreOptions {
  /** JSON Lines file. Each line is one TraceEvent. Leave it empty to keep events in memory only. */
  filePath?: string;
  /** The store keeps only the newest events in memory. */
  maxEvents?: number;
}

/**
 * Keeps the server events of each trace.
 *
 * - Memory: the newest `maxEvents` events, for `GET /api/v1/traces/{traceId}`.
 * - File: an append-only JSON Lines log (`traces.jsonl`). A line is written
 *   with one `appendFileSync` call, so a crash cannot damage earlier lines.
 */
export class TraceStore {
  private readonly events: TraceEvent[] = [];
  private readonly maxEvents: number;

  constructor(private readonly options: TraceStoreOptions = {}) {
    this.maxEvents = options.maxEvents ?? 5000;
    if (options.filePath && existsSync(options.filePath)) this.loadFile(options.filePath);
  }

  private loadFile(filePath: string): void {
    const lines = readFileSync(filePath, 'utf8').split('\n').filter(Boolean).slice(-this.maxEvents);
    for (const line of lines) {
      try {
        const parsed = TraceEvent.safeParse(JSON.parse(line));
        if (parsed.success) this.events.push(parsed.data);
      } catch {
        // Ignore a damaged line. The other lines stay usable.
      }
    }
  }

  record(event: TraceEvent): void {
    this.events.push(event);
    if (this.events.length > this.maxEvents)
      this.events.splice(0, this.events.length - this.maxEvents);
    if (this.options.filePath) {
      mkdirSync(dirname(this.options.filePath), { recursive: true });
      appendFileSync(this.options.filePath, `${JSON.stringify(event)}\n`, 'utf8');
    }
  }

  /** Oldest event first. */
  get(traceId: string): TraceEvent[] {
    return this.events.filter((event) => event.traceId === traceId);
  }
}
