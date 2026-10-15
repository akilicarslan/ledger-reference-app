import { Component, type ErrorInfo, type ReactNode } from 'react';
import { View } from 'react-native';
import { reportError } from '@ledger/core';
import { Banner, LiveRegion, useTheme } from '@ledger/ui';
import { TestIds } from './testIds';

export interface ErrorBoundaryProps {
  /** Name of the app section, for example "Account". The message uses it. */
  section: string;
  children: ReactNode;
}

interface ErrorBoundaryState {
  failed: boolean;
  /** The reference ID of the error report. It is null until the report is sent. */
  reportId: string | null;
}

/**
 * Catches a render error in one section of the app.
 *
 * - The other sections (and the tab bar) continue to operate.
 * - The error goes to `reportError` with the React component stack.
 * - The fallback tells the user what happened and what to do, and shows the
 *   Reference ID for support (WCAG 3.3.1). A live region announces it.
 *
 * React 19 has no hook for error boundaries, so this is a class component.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { failed: false, reportId: null };

  static getDerivedStateFromError(): Partial<ErrorBoundaryState> {
    return { failed: true };
  }

  override componentDidCatch(error: unknown, info: ErrorInfo) {
    const report = reportError(error, {
      source: 'render',
      ...(info.componentStack ? { componentStack: info.componentStack } : {}),
    });
    this.setState({ reportId: report.reportId });
  }

  private readonly retry = () => {
    this.setState({ failed: false, reportId: null });
  };

  override render() {
    if (!this.state.failed) return this.props.children;
    return (
      <ErrorFallback
        section={this.props.section}
        reportId={this.state.reportId}
        onRetry={this.retry}
      />
    );
  }
}

const FALLBACK_MESSAGE =
  'An error stopped this section. Your saved transactions are safe on the server. Select “Try again” to load the section again. If the error occurs again, give the Reference ID to support.';

export interface ErrorFallbackProps {
  section: string;
  reportId: string | null;
  onRetry: () => void;
}

/** The screen that the error boundary shows. Exported for Storybook and tests. */
export function ErrorFallback({ section, reportId, onRetry }: ErrorFallbackProps) {
  const theme = useTheme();
  const title = `The ${section} section stopped`;
  return (
    <View style={{ padding: theme.spacing.lg }}>
      <LiveRegion message={`${title}. ${FALLBACK_MESSAGE}`} politeness="assertive">
        <Banner
          tone="error"
          title={title}
          message={FALLBACK_MESSAGE}
          {...(reportId ? { reference: reportId } : {})}
          action={{ label: 'Try again', onPress: onRetry, testID: TestIds.errorBoundary.retry }}
          testID={TestIds.errorBoundary.fallback}
        />
      </LiveRegion>
    </View>
  );
}
