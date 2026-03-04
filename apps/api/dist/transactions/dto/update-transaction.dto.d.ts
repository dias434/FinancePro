export declare class UpdateTransactionDto {
    type?: "INCOME" | "EXPENSE" | "TRANSFER";
    occurredAt?: Date;
    amountCents?: number;
    accountId?: string;
    categoryId?: string | null;
    transferAccountId?: string | null;
    description?: string | null;
    tags?: string[];
    costCenter?: string | null;
    notes?: string | null;
}
