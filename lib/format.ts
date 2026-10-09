/**
 * Formats a number using the Indian numbering system (e.g. 1,200, 14,400, 4,80,000).
 * 100% deterministic pure JavaScript logic to avoid any React SSR/Client hydration mismatches.
 */
export function formatINR(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) return '0';
  const rounded = Math.round(amount);
  const isNegative = rounded < 0;
  const str = Math.abs(rounded).toString();

  if (str.length <= 3) {
    return (isNegative ? '-' : '') + str;
  }

  const last3 = str.substring(str.length - 3);
  const otherDigits = str.substring(0, str.length - 3);
  const formattedOther = otherDigits.replace(/\B(?=(\d{2})+(?!\d))/g, ',');

  return (isNegative ? '-' : '') + formattedOther + ',' + last3;
}
