import type { Middleware } from '@reduxjs/toolkit';
import { newTraceId } from '@ledger/contracts';

/**
 * Crash and error reporting.
 *
 * The app does not send reports to a service in this showcase. The default
 * reporter writes one structured line to the console. A production app gives
 * a reporter for its service (for example Sentry or Crashlytics) with
 * `setErrorReporter`. The rest of the code does not change.
 *
 * Privacy rule: a report has no form values, amounts, titles or images.
 * Breadcrumbs keep only the Redux action type (for example
 * "account/submitTransaction/rejected"), never the payload.
 */

export type ErrorSource = 'render' | 'global' | 'unhandled-promise';

export interface ErrorReport {
  /** New W3C trace ID for this error. The UI shows it as the "Reference ID". */
  reportId: string;
  occurredAt: string;
  source: ErrorSource;
  /** True when the app cannot continue (for example an uncaught global error). */
  fatal: boolean;
  error: { name: string; message: string; stack?: string };
  /** React component stack, for render errors. */
  componentStack?: string;
  /** The last user actions (Redux action types), oldest first. */
  breadcrumbs: readonly Breadcrumb[];
}

export interface Breadcrumb {
  at: string;
  type: string;
}

export type ErrorReporter = (report: ErrorReport) => void;

const MAX_BREADCRUMBS = 20;
const breadcrumbs: Breadcrumb[] = [];

const consoleReporter: ErrorReporter = (report) => {
  // One line, so a log search with the reference ID finds the full report.
  console.error(`[error-report] ${report.reportId} ${JSON.stringify(report)}`);
};

let reporter: ErrorReporter = consoleReporter;

/** Replaces the reporter. Returns a function that restores the previous one. */
export function setErrorReporter(next: ErrorReporter): () => void {
  const previous = reporter;
  reporter = next;
  return () => {
    reporter = previous;
  };
}

export function addBreadcrumb(type: string, at: Date = new Date()): void {
  breadcrumbs.push({ at: at.toISOString(), type });
  if (breadcrumbs.length > MAX_BREADCRUMBS) breadcrumbs.shift();
}

export function clearBreadcrumbs(): void {
  breadcrumbs.length = 0;
}

function normalizeError(error: unknown): ErrorReport['error'] {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      ...(error.stack ? { stack: error.stack } : {}),
    };
  }
  return { name: 'NonError', message: typeof error === 'string' ? error : 'Unknown error' };
}

/**
 * Sends one report and returns it. The caller shows `reportId` to the user.
 * A reporter that fails cannot crash the app.
 */
export function reportError(
  error: unknown,
  options: { source: ErrorSource; fatal?: boolean; componentStack?: string },
): ErrorReport {
  const report: ErrorReport = {
    reportId: newTraceId(),
    occurredAt: new Date().toISOString(),
    source: options.source,
    fatal: options.fatal ?? false,
    error: normalizeError(error),
    ...(options.componentStack ? { componentStack: options.componentStack } : {}),
    breadcrumbs: [...breadcrumbs],
  };
  try {
    reporter(report);
  } catch {
    // Do not let the reporter hide the original error.
  }
  return report;
}

/** Redux middleware: keeps the type of each action as a breadcrumb. */
export const breadcrumbMiddleware: Middleware = () => (next) => (action) => {
  if (typeof action === 'object' && action !== null && 'type' in action) {
    addBreadcrumb(String((action as { type: unknown }).type));
  }
  return next(action);
};

interface ReactNativeErrorUtils {
  getGlobalHandler(): (error: unknown, isFatal?: boolean) => void;
  setGlobalHandler(handler: (error: unknown, isFatal?: boolean) => void): void;
}

let installed = false;

/**
 * Reports errors that no component catches:
 * - React Native: `ErrorUtils` global handler (the previous handler still runs,
 *   so the red box in development and the native crash in release stay the same).
 * - Web: `error` and `unhandledrejection` events.
 * Call it one time, at app start.
 */
export function installGlobalErrorHandlers(): void {
  if (installed) return;
  installed = true;
  const scope = globalThis as {
    ErrorUtils?: ReactNativeErrorUtils;
    addEventListener?: (type: string, listener: (event: unknown) => void) => void;
  };

  if (scope.ErrorUtils) {
    const previous = scope.ErrorUtils.getGlobalHandler();
    scope.ErrorUtils.setGlobalHandler((error, isFatal) => {
      reportError(error, { source: 'global', fatal: Boolean(isFatal) });
      previous(error, isFatal);
    });
    return;
  }

  scope.addEventListener?.('error', (event) => {
    reportError((event as { error?: unknown }).error, { source: 'global' });
  });
  scope.addEventListener?.('unhandledrejection', (event) => {
    reportError((event as { reason?: unknown }).reason, { source: 'unhandled-promise' });
  });
}
