export const supportedCurrencies = ["BRL", "USD", "EUR", "GBP"] as const

export type SupportedCurrency = (typeof supportedCurrencies)[number]

export function formatMoney(cents: number, currency: string) {
  const normalized = currency.trim().toUpperCase()

  try {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: normalized,
    }).format(cents / 100)
  } catch {
    return `${normalized} ${(cents / 100).toFixed(2)}`
  }
}

export function currencyLabel(currency: string) {
  const normalized = currency.trim().toUpperCase()
  switch (normalized) {
    case "BRL":
      return "Real (BRL)"
    case "USD":
      return "Dolar (USD)"
    case "EUR":
      return "Euro (EUR)"
    case "GBP":
      return "Libra (GBP)"
    default:
      return normalized
  }
}
