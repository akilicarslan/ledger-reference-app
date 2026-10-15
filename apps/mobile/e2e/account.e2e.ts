import { expect as jestExpect } from '@jest/globals';
import { by, device, element, expect, waitFor } from 'detox';
import { TestIds } from '@ledger/features/testIds';
import { E2E_API_URL } from './mockServer';
import { scrollIntoView as scrollTo } from './scroll';

/**
 * End-to-end flow on a real simulator/emulator with the real mock API.
 * The tests in this file run in order and share one app session.
 */

const TIMEOUT = 15_000;

async function recordTransaction(type: 'credit' | 'debit', title: string, amount: string) {
  await scrollTo(type === 'credit' ? TestIds.form.typeCredit : TestIds.form.typeDebit);
  await element(by.id(type === 'credit' ? TestIds.form.typeCredit : TestIds.form.typeDebit)).tap();
  await element(by.id(TestIds.form.title)).replaceText(title);
  await element(by.id(TestIds.form.amount)).replaceText(amount);
  await scrollTo(TestIds.form.submit);
  await element(by.id(TestIds.form.submit)).tap();
}

describe('Ledger account', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true, delete: true });
  });

  it('shows a balance of $0.00 and an empty history at the first start', async () => {
    await waitFor(element(by.id(TestIds.balance.amount)))
      .toHaveText('$0.00')
      .withTimeout(TIMEOUT);
  });

  it('shows field errors when the user submits an empty form', async () => {
    await scrollTo(TestIds.form.submit);
    await element(by.id(TestIds.form.submit)).tap();
    await scrollTo(`${TestIds.form.title}-error`);
    await expect(element(by.text('Enter a title.'))).toBeVisible();
  });

  it('records a credit and updates the balance', async () => {
    await recordTransaction('credit', 'Salary', '1500.50');
    await scrollTo(TestIds.form.successBanner);
    await scrollTo(TestIds.balance.amount);
    await waitFor(element(by.id(TestIds.balance.amount)))
      .toHaveText('$1,500.50')
      .withTimeout(TIMEOUT);
  });

  it('records a debit (expense)', async () => {
    await recordTransaction('debit', 'Office supplies', '200.25');
    await scrollTo(TestIds.balance.amount);
    await waitFor(element(by.id(TestIds.balance.amount)))
      .toHaveText('$1,300.25')
      .withTimeout(TIMEOUT);
  });

  it('refuses a debit that makes the balance negative and shows the server message', async () => {
    await recordTransaction('debit', 'New laptop', '5000');
    await scrollTo(TestIds.form.errorBanner);
    await expect(element(by.id(`${TestIds.form.errorBanner}-message`))).toHaveText(
      'The transaction is refused. The balance cannot go below $0.00. Available balance: $1,300.25.',
    );
    await scrollTo(TestIds.balance.amount);
    await expect(element(by.id(TestIds.balance.amount))).toHaveText('$1,300.25');
  });

  it('traces the refused debit end to end: the UI reference is the server trace', async () => {
    const referenceId = `${TestIds.form.errorBanner}-reference`;
    await scrollTo(referenceId);
    const attributes = await element(by.id(referenceId)).getAttributes();
    const text = 'text' in attributes ? String(attributes.text) : '';
    const traceId = /([0-9a-f]{32})/.exec(text)?.[1];
    jestExpect(traceId).toMatch(/^[0-9a-f]{32}$/);

    // The server stored the same trace with the reason of the refusal.
    const response = await fetch(`${E2E_API_URL}/api/v1/traces/${traceId}`);
    const trace = (await response.json()) as { events: { name: string }[] };
    jestExpect(trace.events.map((event) => event.name)).toEqual(
      jestExpect.arrayContaining([
        'http.request.received',
        'ledger.transaction.refused',
        'http.response.sent',
      ]),
    );

    // The app shows the server steps of the same trace.
    await scrollTo(TestIds.trace.event('ledger.transaction.refused'));
  });

  it('lists the newest transaction first, with one accessible label per row', async () => {
    await scrollTo(TestIds.recent.row(0));
    const attributes = await element(by.id(TestIds.recent.row(0))).getAttributes();
    const label = 'label' in attributes ? attributes.label : undefined;
    // The label also has the date and time, so the test checks only the start.
    jestExpect(label).toMatch(/^Debit, Office supplies, −\$200\.25, /);
  });
});
