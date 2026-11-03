import { QueryClient } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { createFakeApi } from '@ledger/core/testing';
import { AppProviders, AppShell, TestIds } from '@ledger/features';

/**
 * Renders the shared screens with the React Native renderer (not
 * react-native-web). These tests check the native accessibility mapping
 * that VoiceOver and TalkBack receive.
 */

function renderApp() {
  const queryClient = new QueryClient({
    // gcTime Infinity: no cache timers stay open after a test (Jest worker exits cleanly).
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  return render(
    <AppProviders
      api={createFakeApi()}
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
