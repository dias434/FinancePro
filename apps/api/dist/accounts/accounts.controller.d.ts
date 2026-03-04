import { AccountListQueryDto } from "./dto/account-list.query";
import { CreateAccountDto } from "./dto/create-account.dto";
import { ReconcileDto } from "./dto/reconcile.dto";
import { UpdateAccountDto } from "./dto/update-account.dto";
import { AccountsService } from "./accounts.service";
export declare class AccountsController {
    private readonly accounts;
    constructor(accounts: AccountsService);
    list(req: any, query: AccountListQueryDto): Promise<{
        page: number;
        pageSize: number;
        total: number;
        items: {
            id: string;
            name: string;
            type: import("./dto/create-account.dto").ApiAccountType;
            currency: string;
            limitCents: number | undefined;
            closingDay: number | undefined;
            dueDay: number | undefined;
            balanceCents: number;
            debtCents: number | undefined;
            availableCents: number | undefined;
            createdAt: string;
            updatedAt: string;
        }[];
    }>;
    create(req: any, dto: CreateAccountDto): Promise<{
        id: string;
        name: string;
        type: import("./dto/create-account.dto").ApiAccountType;
        currency: string;
        limitCents: number | undefined;
        closingDay: number | undefined;
        dueDay: number | undefined;
        balanceCents: number;
        debtCents: number | undefined;
        availableCents: number | undefined;
        createdAt: string;
        updatedAt: string;
    }>;
    listBills(req: any, id: string, limit?: string): Promise<{
        bills: {
            month: string;
            dueDate: string;
            totalCents: number;
            paidCents: number;
            remainingCents: number;
            periodStart: string;
            periodEnd: string;
        }[];
    }>;
    listReconciliations(req: any, id: string, page?: string, pageSize?: string): Promise<{
        page: number;
        pageSize: number;
        total: number;
        items: {
            id: string;
            recordedAt: string;
            expectedBalanceCents: number;
            actualBalanceCents: number;
            diffCents: number;
            note: string | undefined;
        }[];
    }>;
    get(req: any, id: string): Promise<{
        id: string;
        name: string;
        type: import("./dto/create-account.dto").ApiAccountType;
        currency: string;
        limitCents: number | undefined;
        closingDay: number | undefined;
        dueDay: number | undefined;
        balanceCents: number;
        debtCents: number | undefined;
        availableCents: number | undefined;
        createdAt: string;
        updatedAt: string;
    }>;
    update(req: any, id: string, dto: UpdateAccountDto): Promise<{
        id: string;
        name: string;
        type: import("./dto/create-account.dto").ApiAccountType;
        currency: string;
        limitCents: number | undefined;
        closingDay: number | undefined;
        dueDay: number | undefined;
        balanceCents: number;
        debtCents: number | undefined;
        availableCents: number | undefined;
        createdAt: string;
        updatedAt: string;
    }>;
    reconcile(req: any, id: string, dto: ReconcileDto): Promise<{
        id: string;
        accountId: string;
        recordedAt: string;
        expectedBalanceCents: number;
        actualBalanceCents: number;
        diffCents: number;
        note: string | undefined;
    }>;
    remove(req: any, id: string): Promise<{
        ok: boolean;
    }>;
}
