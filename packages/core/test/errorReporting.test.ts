import { afterEach, describe, expect, it } from 'vitest';
import {
  clearBreadcrumbs,
  reportError,
  setErrorReporter,
  type ErrorReport,
} from '../src/diagnostics/errorReporting';
import { submitTransaction } from '../src/store/accountSlice';
import { createLedgerStore } from '../src/store/store';
import { createFakeApi } from './fakes';

afterEach(clearBreadcrumbs);

describe('error reporting', () => {
  it('sends a report with a new Reference ID and the last action types', async () => {
    const reports: ErrorReport[] = [];
    const restore = setErrorReporter((report) => reports.push(report));
    const store = createLedgerStore(createFakeApi(0));
    await store.dispatch(
      submitTransaction({ input: { type: 'debit', amount: 99, title: 'Private title' } }),
    );

    const report = reportError(new TypeError('x is undefined'), { source: 'global', fatal: true });
    restore();

    expect(reports).toEqual([report]);
    expect(report.reportId).toMatch(/^[0-9a-f]{32}$/);
    expect(report).toMatchObject({
      source: 'global',
      fatal: true,
      error: { name: 'TypeError', message: 'x is undefined' },
    });
    expect(report.breadcrumbs.map((crumb) => crumb.type)).toEqual([
      'account/submitTransaction/pending',
      'account/submitTransaction/rejected',
    ]);
  });

  it('does not put form values or amounts in the report (privacy)', async () => {
    let captured: ErrorReport | undefined;
    const restore = setErrorReporter((report) => (captured = report));
    const store = createLedgerStore(createFakeApi(0));
    await store.dispatch(
      submitTransaction({ input: { type: 'debit', amount: 4321.99, title: 'Private title' } }),
    );
    reportError(new Error('boom'), { source: 'render' });
    restore();
    const text = JSON.stringify(captured);
    expect(text).not.toContain('Private title');
    expect(text).not.toContain('4321.99');
  });

  it('keeps the original error when the reporter fails', () => {
    const restore = setErrorReporter(() => {
      throw new Error('reporter is down');
    });
    expect(() => reportError('plain text', { source: 'unhandled-promise' })).not.toThrow();
    expect(reportError('plain text', { source: 'unhandled-promise' }).error).toEqual({
      name: 'NonError',
      message: 'plain text',
    });
    restore();
  });
});
