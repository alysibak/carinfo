import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import SelectMenu, { type SelectOption } from './SelectMenu';

const OPTIONS: SelectOption[] = [
  { value: 'newest', label: 'Newest' },
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'price-desc', label: 'Price: high to low' },
  { value: 'mpg', label: 'Best MPG' },
];

function Harness({
  onChange = vi.fn(),
  disabled = false,
}: {
  onChange?: (v: string) => void;
  disabled?: boolean;
}) {
  const [value, setValue] = useState('newest');
  return (
    <>
      <SelectMenu
        aria-label="Sort by"
        value={value}
        options={OPTIONS}
        disabled={disabled}
        onChange={(v) => {
          setValue(v);
          onChange(v);
        }}
      />
      <button type="button">outside</button>
    </>
  );
}

const trigger = () => screen.getByRole('button', { name: /sort by/i });
const key = (k: string) => fireEvent.keyDown(trigger(), { key: k });
const activeOption = () => {
  const id = trigger().getAttribute('aria-activedescendant');
  return id ? document.getElementById(id)?.textContent?.replace('✓', '').trim() : null;
};

describe('SelectMenu', () => {
  it('exposes listbox semantics on the trigger', () => {
    render(<Harness />);
    expect(trigger()).toHaveAttribute('aria-haspopup', 'listbox');
    expect(trigger()).toHaveAttribute('aria-expanded', 'false');
    expect(trigger()).toHaveTextContent('Newest');
  });

  it('opens on ArrowDown with the current value active', () => {
    render(<Harness />);
    key('ArrowDown');
    expect(trigger()).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    expect(activeOption()).toBe('Newest');
    expect(screen.getByRole('option', { name: /newest/i })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  it('moves with arrows, clamps at the ends, and jumps with Home/End', () => {
    render(<Harness />);
    key('ArrowDown'); // open
    key('ArrowDown');
    expect(activeOption()).toBe('Price: low to high');
    key('ArrowUp');
    key('ArrowUp'); // clamps at first
    expect(activeOption()).toBe('Newest');
    key('End');
    expect(activeOption()).toBe('Best MPG');
    key('ArrowDown'); // clamps at last
    expect(activeOption()).toBe('Best MPG');
    key('Home');
    expect(activeOption()).toBe('Newest');
  });

  it('selects with Enter, closes, and returns focus to the trigger', () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    key('ArrowDown');
    key('ArrowDown');
    key('Enter');
    expect(onChange).toHaveBeenCalledWith('price-asc');
    expect(trigger()).toHaveAttribute('aria-expanded', 'false');
    expect(trigger()).toHaveTextContent('Price: low to high');
    expect(document.activeElement).toBe(trigger());
  });

  it('cancels with Escape without changing the value', () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    key('ArrowDown');
    key('ArrowDown');
    key('Escape');
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('jumps to an option by typing its first letters', () => {
    render(<Harness />);
    key('b');
    expect(trigger()).toHaveAttribute('aria-expanded', 'true');
    expect(activeOption()).toBe('Best MPG');
  });

  it('closes when focus tabs away, so the panel is never left behind', () => {
    render(<Harness />);
    key('ArrowDown');
    key('Tab');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('closes on an outside click', () => {
    render(<Harness />);
    fireEvent.click(trigger());
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    fireEvent.mouseDown(screen.getByRole('button', { name: 'outside' }));
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('selects by click', () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    fireEvent.click(trigger());
    fireEvent.click(screen.getByRole('option', { name: /best mpg/i }));
    expect(onChange).toHaveBeenCalledWith('mpg');
  });

  it('ignores input while disabled', () => {
    render(<Harness disabled />);
    expect(trigger()).toBeDisabled();
    key('ArrowDown');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });
});
