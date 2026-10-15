import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  Badge,
  Banner,
  Button,
  Card,
  List,
  ListItem,
  LiveRegion,
  SegmentedControl,
  TabBar,
  TextField,
  ThemeProvider,
} from '../src';

/**
 * These tests check the semantics that react-native-web creates from our
 * props (role, accessible name, state). They prove the web mapping. The
 * native mapping is checked in apps/mobile (jest-expo) and with Detox.
 */
const renderUi = (ui: ReactElement) => render(<ThemeProvider scheme="light">{ui}</ThemeProvider>);

afterEach(cleanup);

describe('Button', () => {
  it('exposes the role "button" and the visible label as its name', () => {
    const onPress = vi.fn();
    renderUi(<Button label="Record transaction" onPress={onPress} />);
    const button = screen.getByRole('button', { name: 'Record transaction' });
    fireEvent.click(button);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('is busy and does not react while loading', () => {
    const onPress = vi.fn();
    renderUi(<Button label="Save" onPress={onPress} loading />);
    const button = screen.getByRole('button', { name: 'Save' });
    expect(button.getAttribute('aria-busy')).toBe('true');
    expect(button.getAttribute('aria-disabled')).toBe('true');
    fireEvent.click(button);
    expect(onPress).not.toHaveBeenCalled();
  });
});

describe('TextField', () => {
  it('uses the label as the accessible name and marks a required field', () => {
    renderUi(<TextField label="Title" required value="" onChangeText={() => {}} />);
    const input = screen.getByRole('textbox', { name: 'Title, required' });
    expect(input.getAttribute('aria-required')).toBe('true');
    expect(input.getAttribute('aria-invalid')).toBe('false');
  });

  it('connects the hint and the error text with aria-describedby', () => {
    renderUi(
      <TextField
        label="Amount"
        hint="For example 12.50"
        error="Enter an amount."
        value=""
        onChangeText={() => {}}
      />,
    );
    const input = screen.getByRole('textbox', { name: 'Amount' });
    expect(input.getAttribute('aria-invalid')).toBe('true');
    const ids = (input.getAttribute('aria-describedby') ?? '').split(' ');
    const texts = ids.map((id) => document.getElementById(id)?.textContent);
    expect(texts).toEqual([expect.stringContaining('Enter an amount.'), 'For example 12.50']);
  });

  it('sends the typed text', () => {
    const onChangeText = vi.fn();
    renderUi(<TextField label="Title" value="" onChangeText={onChangeText} />);
    fireEvent.change(screen.getByRole('textbox', { name: 'Title' }), { target: { value: 'Rent' } });
    expect(onChangeText).toHaveBeenCalledWith('Rent');
  });
});

describe('SegmentedControl', () => {
  it('is a radio group with one checked radio', () => {
    const onChange = vi.fn();
    renderUi(
      <SegmentedControl
        label="Transaction type"
        value="debit"
        onChange={onChange}
        options={[
          { value: 'credit', label: 'Credit' },
          { value: 'debit', label: 'Debit' },
        ]}
      />,
    );
    expect(screen.getByRole('radiogroup', { name: 'Transaction type' })).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'Debit' }).getAttribute('aria-checked')).toBe('true');
    expect(screen.getByRole('radio', { name: 'Credit' }).getAttribute('aria-checked')).toBe(
      'false',
    );
    fireEvent.click(screen.getByRole('radio', { name: 'Credit' }));
    expect(onChange).toHaveBeenCalledWith('credit');
  });
});

describe('TabBar', () => {
  it('is a tab list with a selected tab', () => {
    renderUi(
      <TabBar
        accessibilityLabel="Main sections"
        selectedKey="account"
        onChange={() => {}}
        tabs={[
          { key: 'account', label: 'Account' },
          { key: 'markets', label: 'Markets' },
        ]}
      />,
    );
    expect(screen.getByRole('tablist', { name: 'Main sections' })).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Account' }).getAttribute('aria-selected')).toBe('true');
    expect(screen.getByRole('tab', { name: 'Markets' }).getAttribute('aria-selected')).toBe(
      'false',
    );
  });
});

describe('Card, List and ListItem', () => {
  it('creates a named region with a heading and a list of items with one name each', () => {
    renderUi(
      <Card title="Last 5 transactions">
        <List accessibilityLabel="Last 5 transactions">
          <ListItem
            title="Rent"
            trailing={<Badge label="Debit" />}
            accessibilityLabel="Debit, Rent, minus $500.00"
          />
        </List>
      </Card>,
    );
    expect(screen.getByRole('region', { name: 'Last 5 transactions' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Last 5 transactions' })).toBeTruthy();
    expect(screen.getByRole('list', { name: 'Last 5 transactions' })).toBeTruthy();
    expect(screen.getByRole('listitem', { name: 'Debit, Rent, minus $500.00' })).toBeTruthy();
  });
});

describe('LiveRegion and Banner', () => {
  it('puts an error banner in an assertive live region', () => {
    renderUi(
      <LiveRegion politeness="assertive" message="The transaction is refused.">
        <Banner tone="error" message="The transaction is refused." />
      </LiveRegion>,
    );
    const region = screen.getByRole('alert');
    expect(region.getAttribute('aria-live')).toBe('assertive');
    expect(region.textContent).toContain('Error');
    expect(region.textContent).toContain('The transaction is refused.');
  });

  it('uses a polite status region by default', () => {
    renderUi(<LiveRegion message={null} />);
    expect(screen.getByRole('status').getAttribute('aria-live')).toBe('polite');
  });
});
