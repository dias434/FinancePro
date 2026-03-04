export declare class CreateRecurringDto {
    accountId: string;
    categoryId?: string | null;
    type: "INCOME" | "EXPENSE";
    amountCents: number;
    description?: string;
    frequency: "WEEKLY" | "MONTHLY" | "ANNUAL";
    startDate: Date;
    endDate?: Date | null;
}
