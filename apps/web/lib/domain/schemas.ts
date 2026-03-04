import { z } from "zod"

export const CurrencySchema = z.enum(["BRL"])
export type Currency = z.infer<typeof CurrencySchema>

export const TimestampSchema = z.string().datetime()

export const EntityBaseSchema = z.object({
  id: z.string().min(1),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
  deletedAt: TimestampSchema.nullable().optional(),
})

export const AccountTypeSchema = z.enum(["CASH", "CHECKING", "SAVINGS", "CREDIT_CARD"])
export type AccountType = z.infer<typeof AccountTypeSchema>

export const AccountSchema = EntityBaseSchema.extend({
  name: z.string().min(1),
  type: AccountTypeSchema,
  currency: CurrencySchema.default("BRL"),
})
export type Account = z.infer<typeof AccountSchema>

export const CategorySchema = EntityBaseSchema.extend({
  name: z.string().min(1),
  color: z.string().min(1).optional(),
  icon: z.string().min(1).optional(),
})
export type Category = z.infer<typeof CategorySchema>

export const TransactionTypeSchema = z.enum(["INCOME", "EXPENSE", "TRANSFER"])
export type TransactionType = z.infer<typeof TransactionTypeSchema>

export const TransactionSchema = EntityBaseSchema.extend({
  type: TransactionTypeSchema,
  occurredAt: TimestampSchema,
  amountCents: z.number().int(),
  accountId: z.string().min(1),
  categoryId: z.string().min(1).nullable().optional(),
  description: z.string().max(200).optional(),
  transferAccountId: z.string().min(1).nullable().optional(),
})
export type Transaction = z.infer<typeof TransactionSchema>

