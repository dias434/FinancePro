export declare class UpdateRecurringDto {
    accountId?: string;
    categoryId?: string | null;
    type?: "INCOME" | "EXPENSE";
    amountCents?: number;
    description?: string | null;
    frequency?: "WEEKLY" | "MONTHLY" | "ANNUAL";
    startDate?: Date;
    endDate?: Date | null;
    status?: "ACTIVE" | "PAUSED" | "CANCELLED";
}
