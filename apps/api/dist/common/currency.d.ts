export declare const DEFAULT_BASE_CURRENCY = "BRL";
export declare function listSupportedCurrencies(): string[];
export declare function normalizeCurrencyCode(raw: string | null | undefined, fallback?: string): string;
export declare function assertSupportedCurrency(raw: string | null | undefined, input?: {
    fallback?: string;
    code?: string;
    message?: string;
}): string;
export declare function convertMoneyCents(amountCents: number, fromCurrency: string, toCurrency: string): number;
