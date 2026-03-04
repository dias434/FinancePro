import { OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ImportsService } from "../imports/imports.service";
export declare class MonthlyBackupJobsService implements OnModuleInit, OnModuleDestroy {
    private readonly imports;
    private readonly config;
    private readonly logger;
    private timer;
    private readonly jobsEnabled;
    private readonly intervalMinutes;
    constructor(imports: ImportsService, config: ConfigService);
    onModuleInit(): void;
    onModuleDestroy(): void;
    private runBackups;
}
