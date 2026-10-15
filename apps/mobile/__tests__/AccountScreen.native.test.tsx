import { QueryClient } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import type { Balance, NewTransactionInput, Transaction } from '@ledger/contracts';
import { ApiError, type ApiClient } from '@ledger/core';
import { AppProviders, AppShell, TestIds } from '@ledger/features';

/**
 * Renders the shared screens with the React Native renderer (not
 * react-native-web). These tests check the native accessibility mapping
 * that VoiceOver and TalkBack receive.
 */

const NOW = '2026-10-13T09:00:00.000Z';

function createMemoryApi(): ApiClient {
  let cents = 0;
  const items: Transaction[] = [];
  const balance = (): Balance => ({ amount: cents / 100, currency: 'USD', updatedAt: NOW });
  return {
    getBalance: async () => balance(),
    getRecentTransactions: async (limit = 5) => items.slice(0, limit),
    createTransaction: async (input: NewTransactionInput, options) => {
      const delta = Math.round(input.amount * 100) * (input.type === 'credit' ? 1 : -1);
      if (cents + delta < 0)
        throw new ApiError('INSUFFICIENT_FUNDS', 'The transaction is refused.');
      cents += delta;
      const transaction: Transaction = {
        id: `00000000-0000-4000-8000-${String(items.length + 1).padStart(12, '0')}`,
        type: input.type,
        amount: input.amount,
        title: input.title,
        description: input.description ?? '',
        dateTime: input.dateTime ?? NOW,
        receiptImage: null,
        balanceAfter: cents / 100,
        traceId: options?.traceId ?? 'f'.repeat(32),
      };
      items.unshift(transaction);
      return { transaction, balance: balance() };
    },
    getStockQuotes: async () => [],
    searchStocks: async () => [],
    getTrace: async (traceId) => ({ traceId, events: [] }),
  };
}

function renderApp() {
  const queryClient = new QueryClient({
    // gcTime Infinity: no cache timers stay open after a test (Jest worker exits cleanly).
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  return render(
    <AppProviders
      api={createMemoryApi()}
      services={{ pickImage: async () => null }}
      queryClient={queryClient}
      scheme="light"
    >
      <AppShell />
    </AppProviders>,
  );
}

describe('Account screen on the native renderer', () => {
  it('exposes the header, the tabs and the selected tab state', async () => {
    await renderApp();
    expect(screen.getByRole('heading', { name: 'Ledger' })).toBeOnTheScreen();
    expect(screen.getByRole('tab', { name: 'Account' })).toBeSelected();
    expect(screen.getByRole('tab', { name: 'Markets' })).not.toBeSelected();
    await waitFor(() =>
      expect(screen.getByTestId(TestIds.balance.amount)).toHaveTextContent('$0.00'),
    );
  });

  it('maps the transaction type to radio buttons with a checked state', async () => {
    await renderApp();
    await screen.findByTestId(TestIds.balance.amount);
    const credit = screen.getByRole('radio', { name: 'Credit, Add funds' });
    expect(credit).not.toBeChecked();
    await fireEvent.press(credit);
    expect(screen.getByRole('radio', { name: 'Credit, Add funds' })).toBeChecked();
  });

  it('gives the error text to VoiceOver and TalkBack in the accessibility hint', async () => {
    await renderApp();
    await screen.findByTestId(TestIds.balance.amount);
    await fireEvent.press(screen.getByTestId(TestIds.form.submit));
    const title = await screen.findByTestId(TestIds.form.title);
    expect(title.props.accessibilityLabel).toBe('Title, required');
    expect(title.props.accessibilityHint).toBe('Error: Enter a title.');
  });

  it('records a credit and refuses an overdraft with a visible message', async () => {
    await renderApp();
    await screen.findByTestId(TestIds.balance.amount);

    await fireEvent.press(screen.getByTestId(TestIds.form.typeCredit));
    await fireEvent.changeText(screen.getByTestId(TestIds.form.title), 'Salary');
    await fireEvent.changeText(screen.getByTestId(TestIds.form.amount), '150');
    await fireEvent.press(screen.getByTestId(TestIds.form.submit));
    await waitFor(() =>
      expect(screen.getByTestId(TestIds.balance.amount)).toHaveTextContent('$150.00'),
    );
    expect(screen.getByLabelText(/^Credit, Salary, \+\$150\.00/)).toBeOnTheScreen();

    await fireEvent.press(screen.getByTestId(TestIds.form.typeDebit));
    await fireEvent.changeText(screen.getByTestId(TestIds.form.title), 'Laptop');
    await fireEvent.changeText(screen.getByTestId(TestIds.form.amount), '999');
    await fireEvent.press(screen.getByTestId(TestIds.form.submit));
    expect(await screen.findByTestId(TestIds.form.errorBanner)).toHaveTextContent(
      /Transaction refused/,
    );
    expect(screen.getByTestId(TestIds.balance.amount)).toHaveTextContent('$150.00');
  });
});
