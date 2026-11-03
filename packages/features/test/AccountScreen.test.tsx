import { QueryClient } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createFakeApi } from '@ledger/core/testing';
import { AppProviders, AppShell, TestIds, bannerTestIds, type PlatformServices } from '../src';

const services: PlatformServices = { pickImage: vi.fn(async () => null) };

function renderApp() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <AppProviders
      api={createFakeApi()}
      services={services}
      queryClient={queryClient}
      scheme="light"
    >
      <AppShell />
    </AppProviders>,
  );
}

const byTestId = (id: string) => screen.getByTestId(id);

function fillForm({
  type,
  title,
  amount,
}: {
  type: 'credit' | 'debit';
  title: string;
  amount: string;
}) {
  fireEvent.click(byTestId(type === 'credit' ? TestIds.form.typeCredit : TestIds.form.typeDebit));
  fireEvent.change(byTestId(TestIds.form.title), { target: { value: title } });
  fireEvent.change(byTestId(TestIds.form.amount), { target: { value: amount } });
  fireEvent.click(byTestId(TestIds.form.submit));
}

afterEach(cleanup);

describe('Account screen (shared by mobile and web)', () => {
  it('shows the balance and an empty history after the first load', async () => {
    renderApp();
    await waitFor(() => expect(byTestId(TestIds.balance.amount).textContent).toBe('$0.00'));
    expect(byTestId(TestIds.recent.empty)).toBeTruthy();
    expect(screen.getByRole('heading', { level: 1, name: 'Ledger' })).toBeTruthy();
  });

  it('shows an error next to each invalid field and a summary alert', async () => {
    renderApp();
    await waitFor(() => expect(byTestId(TestIds.balance.amount)).toBeTruthy());
    fireEvent.click(byTestId(TestIds.form.submit));
    expect(await screen.findByText('Enter a title.')).toBeTruthy();
    expect(screen.getByText('Enter an amount.')).toBeTruthy();
    const alert = within(byTestId(TestIds.form.container)).getAllByRole('alert')[0];
    expect(alert?.textContent).toContain('The form has 2 errors.');
    expect(
      screen.getByRole('textbox', { name: 'Title, required' }).getAttribute('aria-invalid'),
    ).toBe('true');
  });

  it('records a credit, updates the balance and puts the transaction first', async () => {
    renderApp();
    await waitFor(() => expect(byTestId(TestIds.balance.amount).textContent).toBe('$0.00'));
    fillForm({ type: 'credit', title: 'Salary', amount: '1500.25' });

    await waitFor(() => expect(byTestId(TestIds.balance.amount).textContent).toBe('$1,500.25'));
    expect(byTestId(TestIds.form.successBanner).textContent).toContain('New balance: $1,500.25.');
    expect(screen.getByRole('listitem', { name: /^Credit, Salary, \+\$1,500\.25/ })).toBeTruthy();
    // The form is empty again, so the user can record the next transaction.
    expect((byTestId(TestIds.form.title) as HTMLInputElement).value).toBe('');
  });

  it('refuses a debit that makes the balance negative and shows the server message', async () => {
    renderApp();
    await waitFor(() => expect(byTestId(TestIds.balance.amount)).toBeTruthy());
    fillForm({ type: 'credit', title: 'Cash', amount: '20' });
    await waitFor(() => expect(byTestId(TestIds.balance.amount).textContent).toBe('$20.00'));

    fillForm({ type: 'debit', title: 'Laptop', amount: '900' });
    const banner = await screen.findByTestId(TestIds.form.errorBanner);
    expect(banner.textContent).toContain('Transaction refused');
    expect(banner.textContent).toContain('Available balance: $20.00.');
    // End-to-end trace: the banner reference, the trace card and the server events agree.
    const reference =
      screen.getByTestId(bannerTestIds(TestIds.form.errorBanner).reference).textContent ?? '';
    const traceId = reference.replace('Reference ID: ', '');
    expect(traceId).toMatch(/^[0-9a-f]{32}$/);
    expect(byTestId(TestIds.trace.id).textContent).toBe(traceId);
    expect(
      await screen.findByTestId(TestIds.trace.event('ledger.transaction.refused')),
    ).toBeTruthy();
    expect(byTestId(TestIds.balance.amount).textContent).toBe('$20.00');
    // The values stay in the form, so the user can correct the amount.
    expect((byTestId(TestIds.form.title) as HTMLInputElement).value).toBe('Laptop');
  });
});
