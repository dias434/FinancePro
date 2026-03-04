export type ApiAccountType = "CASH" | "CHECKING" | "SAVINGS" | "CREDIT_CARD";
export declare class CreateAccountDto {
    name: string;
    type?: ApiAccountType;
    currency?: string;
    limitCents?: number;
    closingDay?: number;
    dueDay?: number;
}
