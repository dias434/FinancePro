"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildOpenApiSpec = buildOpenApiSpec;
function buildOpenApiSpec(baseUrl) {
    return {
        openapi: "3.0.3",
        info: {
            title: "FinancePro API",
            version: "0.1.0",
            description: "Documentação básica (Fase 1) - Auth e Health",
        },
        servers: baseUrl ? [{ url: baseUrl }] : [],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: "http",
                    scheme: "bearer",
                    bearerFormat: "JWT",
                },
            },
            schemas: {
                Error: {
                    type: "object",
                    properties: {
                        statusCode: { type: "integer" },
                        code: { type: "string" },
                        message: { type: "string" },
                        timestamp: { type: "string", format: "date-time" },
                        path: { type: "string" },
                        details: {},
                    },
                    required: ["statusCode", "code", "message", "timestamp", "path"],
                },
                AuthUser: {
                    type: "object",
                    properties: {
                        id: { type: "string", format: "uuid" },
                        email: { type: "string", format: "email" },
                        name: { type: "string", nullable: true },
                    },
                    required: ["id", "email"],
                },
                AuthTokens: {
                    type: "object",
                    properties: {
                        accessToken: { type: "string" },
                        refreshToken: { type: "string" },
                    },
                    required: ["accessToken", "refreshToken"],
                },
                AuthResult: {
                    allOf: [
                        {
                            type: "object",
                            properties: {
                                user: { $ref: "#/components/schemas/AuthUser" },
                            },
                            required: ["user"],
                        },
                        { $ref: "#/components/schemas/AuthTokens" },
                    ],
                },
            },
        },
        paths: {
            "/health": {
                get: {
                    tags: ["Health"],
                    summary: "Health check",
                    responses: {
                        "200": {
                            description: "OK",
                            content: { "application/json": { schema: { type: "object" } } },
                        },
                    },
                },
            },
            "/auth/register": {
                post: {
                    tags: ["Auth"],
                    summary: "Criar usuário e emitir tokens",
                    requestBody: {
                        required: true,
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        email: { type: "string", format: "email" },
                                        password: { type: "string", minLength: 8 },
                                        name: { type: "string" },
                                    },
                                    required: ["email", "password"],
                                },
                            },
                        },
                    },
                    responses: {
                        "201": {
                            description: "Criado",
                            content: {
                                "application/json": { schema: { $ref: "#/components/schemas/AuthResult" } },
                            },
                        },
                        "400": { description: "Erro", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
                        "409": { description: "Conflito", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
                    },
                },
            },
            "/auth/login": {
                post: {
                    tags: ["Auth"],
                    summary: "Login e emissão de tokens",
                    requestBody: {
                        required: true,
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        email: { type: "string", format: "email" },
                                        password: { type: "string", minLength: 8 },
                                    },
                                    required: ["email", "password"],
                                },
                            },
                        },
                    },
                    responses: {
                        "200": {
                            description: "OK",
                            content: {
                                "application/json": { schema: { $ref: "#/components/schemas/AuthResult" } },
                            },
                        },
                        "401": { description: "Unauthorized", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
                    },
                },
            },
            "/auth/refresh": {
                post: {
                    tags: ["Auth"],
                    summary: "Rotacionar refresh token e emitir novo access token",
                    requestBody: {
                        required: true,
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: { refreshToken: { type: "string" } },
                                    required: ["refreshToken"],
                                },
                            },
                        },
                    },
                    responses: {
                        "200": { description: "OK", content: { "application/json": { schema: { $ref: "#/components/schemas/AuthTokens" } } } },
                        "401": { description: "Unauthorized", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
                    },
                },
            },
            "/auth/logout": {
                post: {
                    tags: ["Auth"],
                    summary: "Revogar refresh token",
                    requestBody: {
                        required: true,
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: { refreshToken: { type: "string" } },
                                    required: ["refreshToken"],
                                },
                            },
                        },
                    },
                    responses: {
                        "200": { description: "OK", content: { "application/json": { schema: { type: "object" } } } },
                    },
                },
            },
            "/auth/me": {
                get: {
                    tags: ["Auth"],
                    summary: "Dados do usuário logado",
                    security: [{ bearerAuth: [] }],
                    responses: {
                        "200": { description: "OK", content: { "application/json": { schema: { $ref: "#/components/schemas/AuthUser" } } } },
                        "401": { description: "Unauthorized", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
                    },
                },
            },
        },
    };
}
