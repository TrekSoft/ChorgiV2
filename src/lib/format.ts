export const DATE_FORMAT = 'yyyy-MM-dd'
export const WEEK_KEY_FORMAT = "yyyy-'W'ww"

export function formatCents(cents: number | null | undefined): string {
  return ((cents || 0) / 100).toFixed(2)
}

export function centsToDollarString(cents: number | null | undefined): string {
  return `$${formatCents(cents)}`
}

export function dollarsToCents(dollars: string | null | undefined): number {
  return Math.round(parseFloat(dollars || '0') * 100)
}
