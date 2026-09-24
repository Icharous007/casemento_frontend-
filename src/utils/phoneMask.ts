/**
 * Phone masking utility for Brazilian mobile numbers.
 * Supports formatting during input and unformatting for submission.
 */

/**
 * Applies Brazilian mobile phone mask: XX XXXXX-XXXX
 * Supports partial input during typing.
 * @example
 * "11" -> "11 "
 * "1199999" -> "11 99999"
 * "11999999999" -> "11 99999-9999"
 */
export function maskPhone(value: string): string {
  if (!value) return '';

  const allDigits = value.replace(/\D/g, '');
  const digits = allDigits.length > 11 ? allDigits.slice(-11) : allDigits;

  if (digits.length <= 2) {
    return digits.length === 2 ? `${digits} ` : digits;
  }
  if (digits.length <= 7) {
    return `${digits.slice(0, 2)} ${digits.slice(2)}`;
  }
  return `${digits.slice(0, 2)} ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

/**
 * Removes all formatting from a masked phone number.
 * @example
 * "11 99999-9999" -> "11999999999"
 */
export function unmaskPhone(value: string): string {
  const digits = value.replace(/\D/g, '');
  return digits.length > 11 ? digits.slice(-11) : digits;
}

/**
 * Checks if a phone number has a valid length after unmasking.
 * Brazilian mobile: 11 digits (2-digit area code + 9-digit number)
 */
export function isPhoneLengthValid(value: string): boolean {
  const digits = unmaskPhone(value);
  return digits.length === 11;
}
