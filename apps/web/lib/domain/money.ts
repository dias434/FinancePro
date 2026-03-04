export type MoneyCents = number

export function moneyFromCents(cents: number): MoneyCents {
  if (!Number.isFinite(cents) || !Number.isInteger(cents)) {
    throw new Error("Money must be an integer number of cents")
  }
  return cents
}

