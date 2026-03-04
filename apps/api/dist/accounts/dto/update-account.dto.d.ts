import type { ApiAccountType } from "./create-account.dto";
export declare class UpdateAccountDto {
    name?: string;
    type?: ApiAccountType;
    currency?: string;
    limitCents?: number;
    closingDay?: number;
    dueDay?: number;
}
