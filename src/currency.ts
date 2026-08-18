export function formatPeso(amount: number): string {
  const sign = amount < 0 ? '-' : '';
  const abs = Math.abs(amount);
  const fixed = abs.toFixed(2);
  const [intPart, decPart] = fixed.split('.');
  const withCommas = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${sign}₱${withCommas}.${decPart}`;
}

export function formatPesoCompact(amount: number): string {
  return formatPeso(amount);
}
