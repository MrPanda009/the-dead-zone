/** Display formatters for the Stats dashboard. Fixed locale so server and client render the same digits. */

export const formatInteger = (n: number): string => new Intl.NumberFormat('en-US').format(n);

/** "2022" for one year, "2019–2022" for a span. */
export const formatYearRange = (from: number, to: number): string =>
  from === to ? String(from) : `${from}–${to}`;
