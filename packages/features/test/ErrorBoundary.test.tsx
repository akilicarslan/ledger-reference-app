import { QueryClient } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { setErrorReporter, type ApiClient, type ErrorReport } from '@ledger/core';
import { AppProviders, ErrorBoundary, TestIds } from '../src';

const api = {} as ApiClient;

let shouldThrow = true;
function Unstable() {
  if (shouldThrow) throw new Error('Render failed');
  return <span>Section content</span>;
}

afterEach(cleanup);

describe('ErrorBoundary', () => {
  it('reports a render error, shows the fallback with a Reference ID, and recovers', () => {
    const reports: ErrorReport[] = [];
    const restore = setErrorReporter((report) => reports.push(report));
    // React logs caught render errors to the console. Keep the test output clean.
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    shouldThrow = true;

    render(
      <AppProviders
        api={api}
        services={{ pickImage: async () => null }}
        queryClient={new QueryClient()}
        scheme="light"
      >
        <ErrorBoundary section="Account">
          <Unstable />
        </ErrorBoundary>
      </AppProviders>,
    );

    expect(screen.getByText('The Account section stopped')).toBeTruthy();
    expect(reports).toHaveLength(1);
    const [report] = reports;
    expect(report).toMatchObject({ source: 'render', error: { message: 'Render failed' } });
    expect(report?.componentStack).toContain('Unstable');
    expect(screen.getByTestId(`${TestIds.errorBoundary.fallback}-reference`).textContent).toBe(
      `Reference ID: ${report?.reportId}`,
    );

    shouldThrow = false;
    fireEvent.click(screen.getByTestId(TestIds.errorBoundary.retry));
    expect(screen.getByText('Section content')).toBeTruthy();

    consoleError.mockRestore();
    restore();
  });
});
