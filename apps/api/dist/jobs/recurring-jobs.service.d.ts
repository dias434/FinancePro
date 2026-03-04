import { OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { RecurringService } from "../recurring/recurring.service";
export declare class RecurringJobsService implements OnModuleInit, OnModuleDestroy {
    private readonly recurring;
    private readonly config;
    private readonly logger;
    private timer;
    private readonly jobsEnabled;
    private readonly intervalMinutes;
    constructor(recurring: RecurringService, config: ConfigService);
    onModuleInit(): void;
    onModuleDestroy(): void;
    private runRecurring;
}
