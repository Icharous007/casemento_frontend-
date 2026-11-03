import { describe, expect, it } from 'vitest';
import { parseBrazilianCurrency } from './currency';

describe('parseBrazilianCurrency', () => {
  it('parses cents entered with a comma without scaling the amount', () => {
    expect(parseBrazilianCurrency('12,34')).toBe(12.34);
  });

  it('parses Brazilian thousands and decimal separators', () => {
    expect(parseBrazilianCurrency('1.234,56')).toBe(1234.56);
  });

  it('accepts a dot decimal and an empty optional value', () => {
    expect(parseBrazilianCurrency('12.34')).toBe(12.34);
    expect(parseBrazilianCurrency('')).toBeNull();
  });

  it('rejects invalid values and amounts below one cent', () => {
    expect(parseBrazilianCurrency('12,345')).toBeUndefined();
    expect(parseBrazilianCurrency('0,00')).toBeUndefined();
  });
});
