export const ACCOUNTS_CACHE_KEY = "accounts:list:createdAt:desc"
export const CATEGORIES_CACHE_KEY = "categories:list:name:asc"
export const GOALS_CACHE_KEY = "goals:list:targetDate:asc"
export const TRANSACTION_LOOKUPS_CACHE_KEY = "transactions:lookups"
export const TRANSACTION_BASE_CACHE_KEY = "transactions:list:base"
export const BUDGET_EXPENSE_CATEGORIES_CACHE_KEY = "budgets:categories:expense"
export const IMPORT_EXPORT_ACCOUNTS_CACHE_KEY = "import-export:accounts"
export const IMPORT_EXPORT_LOGS_CACHE_KEY = "import-export:logs"
export const IMPORT_EXPORT_BACKUPS_CACHE_KEY = "import-export:backups"

export function getBudgetsCacheKey(year: number | string, month: number | string) {
  const yearKey = String(year).trim() || "all"
  const monthKey = String(month).trim() || "all"
  return `budgets:list:${yearKey}:${monthKey}`
}
