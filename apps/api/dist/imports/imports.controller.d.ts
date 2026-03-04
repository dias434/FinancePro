import { ExportTransactionsQueryDto } from "./dto/export-transactions.query";
import { ImportLogsQueryDto } from "./dto/import-logs.query";
import { PreviewImportDto } from "./dto/preview-import.dto";
import { RunMonthlyBackupDto } from "./dto/run-monthly-backup.dto";
import { RunImportDto } from "./dto/run-import.dto";
import { ImportsService } from "./imports.service";
export declare class ImportsController {
    private readonly imports;
    constructor(imports: ImportsService);
    preview(req: any, file: any, dto: PreviewImportDto): Promise<{
        format: "CSV";
        fileName: string;
        delimiter: string;
        columns: string[];
        suggestedMapping: {
            dateColumn?: string;
            amountColumn?: string;
            descriptionColumn?: string;
            typeColumn?: string;
            categoryColumn?: string;
            accountColumn?: string;
        };
        effectiveMapping: {
            dateColumn?: string;
            amountColumn?: string;
            descriptionColumn?: string;
            typeColumn?: string;
            categoryColumn?: string;
            accountColumn?: string;
        };
        totalRows: number;
        validRows: number;
        invalidRows: number;
        sample: {
            rowIndex: number;
            raw: Record<string, string>;
            issues: string[];
            normalized: {
                occurredAt: string;
                amountCents: number;
                type: "INCOME" | "EXPENSE";
                accountId: string;
                categoryId: string | null;
                description: string | undefined;
            } | null;
        }[];
    } | {
        format: "OFX";
        fileName: string;
        totalRows: number;
        validRows: number;
        invalidRows: number;
        sample: {
            rowIndex: number;
            raw: Record<string, string>;
            issues: string[];
            normalized: {
                occurredAt: string;
                amountCents: number;
                type: "INCOME" | "EXPENSE";
                accountId: string;
                categoryId: string | null;
                description: string | undefined;
            } | null;
        }[];
        delimiter?: undefined;
        columns?: undefined;
        suggestedMapping?: undefined;
        effectiveMapping?: undefined;
    }>;
    run(req: any, file: any, dto: RunImportDto): Promise<{
        importLogId: any;
        status: any;
        totals: {
            totalRows: any;
            importedRows: any;
            duplicateRows: any;
            errorRows: any;
        };
        itemsPreview: any;
        completedAt: string | null;
    } | {
        delimiter: string;
        columns: string[];
        effectiveMapping: {
            dateColumn?: string;
            amountColumn?: string;
            descriptionColumn?: string;
            typeColumn?: string;
            categoryColumn?: string;
            accountColumn?: string;
        };
        importLogId: any;
        status: any;
        totals: {
            totalRows: any;
            importedRows: any;
            duplicateRows: any;
            errorRows: any;
        };
        itemsPreview: any;
        completedAt: string | null;
    }>;
    listLogs(req: any, query: ImportLogsQueryDto): Promise<{
        page: number;
        pageSize: number;
        total: any;
        items: any;
    }>;
    getLog(req: any, id: string, itemLimitRaw?: string): Promise<{
        id: any;
        format: any;
        fileName: any;
        status: any;
        mapping: any;
        defaults: any;
        totalRows: any;
        importedRows: any;
        duplicateRows: any;
        errorRows: any;
        replayedFrom: {
            id: any;
            fileName: any;
            createdAt: string | null;
        } | null;
        completedAt: string | null;
        rolledBackAt: string | null;
        createdAt: string | null;
        updatedAt: string | null;
        items: any;
    }>;
    replay(req: any, id: string): Promise<{
        importLogId: any;
        status: any;
        totals: {
            totalRows: any;
            importedRows: any;
            duplicateRows: any;
            errorRows: any;
        };
        itemsPreview: any;
        completedAt: string | null;
        sourceImportLogId: any;
    }>;
    rollback(req: any, id: string): Promise<{
        importLogId: any;
        status: any;
        deletedTransactions: number;
        affectedRows: number;
        rolledBackAt?: undefined;
    } | {
        importLogId: any;
        status: any;
        deletedTransactions: number;
        affectedRows: number;
        rolledBackAt: string | null;
    }>;
    listBackups(req: any): Promise<{
        items: {
            fileName: string;
            monthKey: string | null;
            sizeBytes: number;
            updatedAt: string;
        }[];
    }>;
    runMonthlyBackup(req: any, dto: RunMonthlyBackupDto): Promise<{
        created: boolean;
        fileName: string;
        monthKey: string;
        sizeBytes: number;
        updatedAt: string;
        count?: undefined;
    } | {
        created: boolean;
        fileName: string;
        monthKey: string;
        sizeBytes: number;
        updatedAt: string;
        count: number;
    }>;
    exportTransactions(req: any, query: ExportTransactionsQueryDto, res: any): Promise<string | {
        format: "csv" | "excel";
        fileName: string;
        mimeType: string;
        count: number;
        content: string;
    }>;
}
