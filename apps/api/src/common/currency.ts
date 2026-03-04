import { BadRequestException } from "@nestjs/common"

export const DEFAULT_BASE_CURRENCY = "BRL"

const DEFAULT_EXCHANGE_RATES: Record<string, number> = {
  BRL: 1,
  USD: 5.1,
  EUR: 5.55,
  GBP: 6.45,
}

let cachedExchangeRatesEnv: string | undefined
let cachedExchangeRates: Record<string, number> | null = null

function parseConfiguredExchangeRates(raw: string | undefined) {
  if (!raw?.trim()) return {}

  try {
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {}
    }

    const entries = Object.entries(parsed as Record<string, unknown>)
    const output: Record<string, number> = {}

    for (const [key, value] of entries) {
      const code = key.trim().toUpperCase()
      const numericValue = Number(value)
      if (!/^[A-Z]{3}$/.test(code)) continue
      if (!Number.isFinite(numericValue) || numericValue <= 0) continue
      output[code] = numericValue
    }

    return output
  } catch {
    return {}
  }
}

function getExchangeRates() {
  const env = process.env.EXCHANGE_RATES_JSON
  if (cachedExchangeRates && cachedExchangeRatesEnv === env) {
    return cachedExchangeRates
  }

  cachedExchangeRatesEnv = env
  cachedExchangeRates = {
    ...DEFAULT_EXCHANGE_RATES,
    ...parseConfiguredExchangeRates(env),
  }

  return cachedExchangeRates
}

export function listSupportedCurrencies() {
  return Object.keys(getExchangeRates()).sort()
}

export function normalizeCurrencyCode(raw: string | null | undefined, fallback = DEFAULT_BASE_CURRENCY) {
  const value = raw?.trim().toUpperCase()
  if (!value) return fallback
  return value
}

export function assertSupportedCurrency(
  raw: string | null | undefined,
  input?: {
    fallback?: string
    code?: string
    message?: string
  },
) {
  const fallback = input?.fallback ?? DEFAULT_BASE_CURRENCY
  const code = normalizeCurrencyCode(raw, fallback)
  const supported = getExchangeRates()

  if (!/^[A-Z]{3}$/.test(code) || !supported[code]) {
    throw new BadRequestException({
      code: input?.code ?? "CURRENCY_NOT_SUPPORTED",
      message:
        input?.message ??
        `Moeda invalida. Use uma das moedas suportadas: ${listSupportedCurrencies().join(", ")}`,
    })
  }

  return code
}

export function convertMoneyCents(amountCents: number, fromCurrency: string, toCurrency: string) {
  const fromCode = assertSupportedCurrency(fromCurrency)
  const toCode = assertSupportedCurrency(toCurrency)
  const rates = getExchangeRates()
  return Math.round((amountCents * rates[fromCode]) / rates[toCode])
}
