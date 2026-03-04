"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_BASE_CURRENCY = void 0;
exports.listSupportedCurrencies = listSupportedCurrencies;
exports.normalizeCurrencyCode = normalizeCurrencyCode;
exports.assertSupportedCurrency = assertSupportedCurrency;
exports.convertMoneyCents = convertMoneyCents;
const common_1 = require("@nestjs/common");
exports.DEFAULT_BASE_CURRENCY = "BRL";
const DEFAULT_EXCHANGE_RATES = {
    BRL: 1,
    USD: 5.1,
    EUR: 5.55,
    GBP: 6.45,
};
let cachedExchangeRatesEnv;
let cachedExchangeRates = null;
function parseConfiguredExchangeRates(raw) {
    if (!raw?.trim())
        return {};
    try {
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
            return {};
        }
        const entries = Object.entries(parsed);
        const output = {};
        for (const [key, value] of entries) {
            const code = key.trim().toUpperCase();
            const numericValue = Number(value);
            if (!/^[A-Z]{3}$/.test(code))
                continue;
            if (!Number.isFinite(numericValue) || numericValue <= 0)
                continue;
            output[code] = numericValue;
        }
        return output;
    }
    catch {
        return {};
    }
}
function getExchangeRates() {
    const env = process.env.EXCHANGE_RATES_JSON;
    if (cachedExchangeRates && cachedExchangeRatesEnv === env) {
        return cachedExchangeRates;
    }
    cachedExchangeRatesEnv = env;
    cachedExchangeRates = {
        ...DEFAULT_EXCHANGE_RATES,
        ...parseConfiguredExchangeRates(env),
    };
    return cachedExchangeRates;
}
function listSupportedCurrencies() {
    return Object.keys(getExchangeRates()).sort();
}
function normalizeCurrencyCode(raw, fallback = exports.DEFAULT_BASE_CURRENCY) {
    const value = raw?.trim().toUpperCase();
    if (!value)
        return fallback;
    return value;
}
function assertSupportedCurrency(raw, input) {
    const fallback = input?.fallback ?? exports.DEFAULT_BASE_CURRENCY;
    const code = normalizeCurrencyCode(raw, fallback);
    const supported = getExchangeRates();
    if (!/^[A-Z]{3}$/.test(code) || !supported[code]) {
        throw new common_1.BadRequestException({
            code: input?.code ?? "CURRENCY_NOT_SUPPORTED",
            message: input?.message ??
                `Moeda invalida. Use uma das moedas suportadas: ${listSupportedCurrencies().join(", ")}`,
        });
    }
    return code;
}
function convertMoneyCents(amountCents, fromCurrency, toCurrency) {
    const fromCode = assertSupportedCurrency(fromCurrency);
    const toCode = assertSupportedCurrency(toCurrency);
    const rates = getExchangeRates();
    return Math.round((amountCents * rates[fromCode]) / rates[toCode]);
}
