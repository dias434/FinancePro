export declare class CreateTransactionDto {
    type: "INCOME" | "EXPENSE" | "TRANSFER";
    occurredAt: Date;
    amountCents: number;
    installmentTotal?: number;
    accountId: string;
    categoryId?: string | null;
    transferAccountId?: string | null;
    description?: string;
    tags?: string[];
    costCenter?: string | null;
    notes?: string | null;
}
