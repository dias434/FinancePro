import { CreateTransactionDto } from "./dto/create-transaction.dto";
import { TransactionListQueryDto } from "./dto/transaction-list.query";
import { UpdateTransactionDto } from "./dto/update-transaction.dto";
import { TransactionsService } from "./transactions.service";
export declare class TransactionsController {
    private readonly transactions;
    constructor(transactions: TransactionsService);
    list(req: any, query: TransactionListQueryDto): Promise<{
        page: number;
        pageSize: number;
        total: number;
        items: {
            id: any;
            type: any;
            occurredAt: string;
            amountCents: any;
            accountId: any;
            categoryId: any;
            transferAccountId: any;
            description: any;
            tags: any;
            costCenter: any;
            notes: any;
            installmentGroupId: any;
            installmentIndex: any;
            installmentTotal: any;
            createdAt: string;
            updatedAt: string;
            account: {
                id: any;
                name: any;
                type: any;
                currency: any;
            } | undefined;
            transferAccount: {
                id: any;
                name: any;
                type: any;
                currency: any;
            } | undefined;
            category: {
                id: any;
                name: any;
                type: any;
                icon: any;
                color: any;
            } | undefined;
        }[];
    }>;
    create(req: any, dto: CreateTransactionDto): Promise<{
        id: any;
        type: any;
        occurredAt: string;
        amountCents: any;
        accountId: any;
        categoryId: any;
        transferAccountId: any;
        description: any;
        tags: any;
        costCenter: any;
        notes: any;
        installmentGroupId: any;
        installmentIndex: any;
        installmentTotal: any;
        createdAt: string;
        updatedAt: string;
        account: {
            id: any;
            name: any;
            type: any;
            currency: any;
        } | undefined;
        transferAccount: {
            id: any;
            name: any;
            type: any;
            currency: any;
        } | undefined;
        category: {
            id: any;
            name: any;
            type: any;
            icon: any;
            color: any;
        } | undefined;
    } | {
        ids: string[];
        installmentGroupId: `${string}-${string}-${string}-${string}-${string}`;
        installmentTotal: number;
        firstId: string;
        type: "INCOME" | "EXPENSE" | "TRANSFER";
        totalAmountCents: number;
        items: {
            id: string;
            installmentIndex: number;
            amountCents: number;
            occurredAt: string;
        }[];
    }>;
    update(req: any, id: string, dto: UpdateTransactionDto): Promise<{
        id: any;
        type: any;
        occurredAt: string;
        amountCents: any;
        accountId: any;
        categoryId: any;
        transferAccountId: any;
        description: any;
        tags: any;
        costCenter: any;
        notes: any;
        installmentGroupId: any;
        installmentIndex: any;
        installmentTotal: any;
        createdAt: string;
        updatedAt: string;
        account: {
            id: any;
            name: any;
            type: any;
            currency: any;
        } | undefined;
        transferAccount: {
            id: any;
            name: any;
            type: any;
            currency: any;
        } | undefined;
        category: {
            id: any;
            name: any;
            type: any;
            icon: any;
            color: any;
        } | undefined;
    }>;
    remove(req: any, id: string): Promise<{
        ok: boolean;
    }>;
}
