import { describe, it, expect } from 'vitest';
import { maskPhone, unmaskPhone, isPhoneLengthValid } from '../../utils/phoneMask';

describe('phoneMask utilities', () => {
  describe('maskPhone', () => {
    it('should format 11 digits to (XX) XXXXX-XXXX', () => {
      const result = maskPhone('11987654321');
      expect(result).toBe('(11) 98765-4321');
    });

    it('should handle partial input', () => {
      expect(maskPhone('119876')).toBe('(11) 9876');
      expect(maskPhone('11')).toBe('(11) ');
    });

    it('should return empty string for empty input', () => {
      expect(maskPhone('')).toBe('');
    });

    it('should remove non-digits before masking', () => {
      const result = maskPhone('(11) 98765-4321');
      expect(result).toBe('(11) 98765-4321');
    });
  });

  describe('unmaskPhone', () => {
    it('should remove all non-digits', () => {
      const result = unmaskPhone('(11) 98765-4321');
      expect(result).toBe('11987654321');
    });

    it('should handle empty string', () => {
      expect(unmaskPhone('')).toBe('');
    });

    it('should keep only digits', () => {
      expect(unmaskPhone('(11) 9876-5432-1')).toBe('1198765432 1');
    });
  });

  describe('isPhoneLengthValid', () => {
    it('should return true for exactly 11 digits', () => {
      expect(isPhoneLengthValid('11987654321')).toBe(true);
      expect(isPhoneLengthValid('(11) 98765-4321')).toBe(true);
    });

    it('should return false for less than 11 digits', () => {
      expect(isPhoneLengthValid('119876543')).toBe(false);
      expect(isPhoneLengthValid('(11) 9876')).toBe(false);
    });

    it('should return false for more than 11 digits', () => {
      expect(isPhoneLengthValid('119876543211')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(isPhoneLengthValid('')).toBe(false);
    });
  });
});
