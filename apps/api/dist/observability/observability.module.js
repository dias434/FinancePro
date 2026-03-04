"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ObservabilityModule = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const prisma_module_1 = require("../prisma/prisma.module");
const metrics_service_1 = require("./metrics.service");
const observability_interceptor_1 = require("./observability.interceptor");
const ops_controller_1 = require("./ops.controller");
let ObservabilityModule = class ObservabilityModule {
};
exports.ObservabilityModule = ObservabilityModule;
exports.ObservabilityModule = ObservabilityModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule],
        providers: [
            metrics_service_1.MetricsService,
            {
                provide: core_1.APP_INTERCEPTOR,
                useClass: observability_interceptor_1.ObservabilityInterceptor,
            },
        ],
        controllers: [ops_controller_1.OpsController],
        exports: [metrics_service_1.MetricsService],
    })
], ObservabilityModule);
