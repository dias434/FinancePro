import { PrismaService } from "../prisma/prisma.service";
import { ExportTransactionsQueryDto } from "./dto/export-transactions.query";
import { ImportLogsQueryDto } from "./dto/import-logs.query";
import { PreviewImportDto } from "./dto/preview-import.dto";
import { RunMonthlyBackupDto } from "./dto/run-monthly-backup.dto";
import { RunImportDto } from "./dto/run-import.dto";
export declare const IMPORT_MAX_FILE_SIZE_BYTES: number;
type UploadedImportFile = {
    originalname?: string;
    mimetype?: string;
    size?: number;
    buffer?: Buffer;
};
type CsvColumnMapping = {
    dateColumn?: string;
    amountColumn?: string;
    descriptionColumn?: string;
    typeColumn?: string;
    categoryColumn?: string;
    accountColumn?: string;
};
export declare class ImportsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    private getImportTimeoutMs;
    private withImportTimeout;
    previewImport(userId: string, file: UploadedImportFile | undefined, dto: PreviewImportDto): Promise<{
        format: "CSV";
        fileName: string;
        delimiter: string;
        columns: string[];
        suggestedMapping: CsvColumnMapping;
        effectiveMapping: CsvColumnMapping;
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
    runImport(userId: string, file: UploadedImportFile | undefined, dto: RunImportDto): Promise<{
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
        effectiveMapping: CsvColumnMapping;
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
    listLogs(userId: string, query: ImportLogsQueryDto): Promise<{
        page: number;
        pageSize: number;
        total: any;
        items: any;
    }>;
    getLog(userId: string, id: string, itemLimitRaw?: number): Promise<{
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
    replayLog(userId: string, id: string): Promise<{
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
    rollbackLog(userId: string, id: string): Promise<{
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
    private getMonthlyBackupRootDir;
    private getMonthlyBackupUserDir;
    private buildTransactionExport;
    listMonthlyBackups(userId: string): Promise<{
        items: {
            fileName: string;
            monthKey: string | null;
            sizeBytes: number;
            updatedAt: string;
        }[];
    }>;
    runMonthlyBackup(userId: string, dto?: RunMonthlyBackupDto): Promise<{
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
    runAutomaticMonthlyBackups(): Promise<{
        users: number;
        created: number;
        skipped: number;
        monthKey: string;
    }>;
    exportTransactions(userId: string, query: ExportTransactionsQueryDto): Promise<{
        format: "csv" | "excel";
        fileName: string;
        mimeType: string;
        count: number;
        content: string;
    }>;
    private validateUpload;
    private parseCsvMapping;
    private parseImportDefaults;
    private loadLookups;
    private parseCsvContent;
    private suggestCsvMapping;
    private resolveCsvMappingAgainstHeaders;
    private normalizeCsvRow;
    private parseOfxContent;
    private resolveLookupId;
    private serializeParsedRow;
    private buildDedupeKey;
    private loadExistingDedupeKeys;
    private runImportRows;
    private normalizedToJson;
    private parseNormalizedFromJson;
    private parseRawRowFromJson;
    private serializeLog;
}
export {};
