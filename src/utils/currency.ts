export function parseBrazilianCurrency(value: string): number | null | undefined {
  const normalizedInput = value.trim().replace(/^R\$\s*/i, '').replace(/\s/g, '');
  if (!normalizedInput) return null;
  if (!/^[\d.,]+$/.test(normalizedInput)) return undefined;
  if ((normalizedInput.match(/,/g) ?? []).length > 1) return undefined;

  const normalizedValue = normalizedInput.includes(',')
    ? normalizedInput.replace(/\./g, '').replace(',', '.')
    : /^\d{1,3}(?:\.\d{3})+$/.test(normalizedInput)
      ? normalizedInput.replace(/\./g, '')
      : normalizedInput;

  if (!/^\d+(?:\.\d{1,2})?$/.test(normalizedValue)) return undefined;
  const amount = Number(normalizedValue);
  return Number.isFinite(amount) && amount >= 0.01 ? amount : undefined;
}
