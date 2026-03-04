export declare class ExportTransactionsQueryDto {
    format?: "csv" | "excel";
    from?: string;
    to?: string;
    accountId?: string;
    type?: "INCOME" | "EXPENSE" | "TRANSFER";
    mode?: "json" | "download";
}
