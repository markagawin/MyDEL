export function formatPeso(amount: number): string {
  const sign = amount < 0 ? '-' : '';
  const abs = Math.abs(amount);
  const fixed = abs.toFixed(2);
  const [intPart, decPart] = fixed.split('.');
  const withCommas = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${sign}₱${withCommas}.${decPart}`;
}

/** Whole-peso, no decimals — for tight spaces like calendar day cells. */
export function formatPesoCompact(amount: number): string {
  const sign = amount < 0 ? '-' : '';
  const rounded = Math.round(Math.abs(amount));
  const withCommas = String(rounded).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${sign}₱${withCommas}`;
}
