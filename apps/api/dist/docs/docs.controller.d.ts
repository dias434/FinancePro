export declare class DocsController {
    openapi(req: any): {
        openapi: string;
        info: {
            title: string;
            version: string;
            description: string;
        };
        servers: {
            url: string;
        }[];
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: string;
                    scheme: string;
                    bearerFormat: string;
                };
            };
            schemas: {
                Error: {
                    type: string;
                    properties: {
                        statusCode: {
                            type: string;
                        };
                        code: {
                            type: string;
                        };
                        message: {
                            type: string;
                        };
                        timestamp: {
                            type: string;
                            format: string;
                        };
                        path: {
                            type: string;
                        };
                        details: {};
                    };
                    required: string[];
                };
                AuthUser: {
                    type: string;
                    properties: {
                        id: {
                            type: string;
                            format: string;
                        };
                        email: {
                            type: string;
                            format: string;
                        };
                        name: {
                            type: string;
                            nullable: boolean;
                        };
                    };
                    required: string[];
                };
                AuthTokens: {
                    type: string;
                    properties: {
                        accessToken: {
                            type: string;
                        };
                        refreshToken: {
                            type: string;
                        };
                    };
                    required: string[];
                };
                AuthResult: {
                    allOf: ({
                        type: string;
                        properties: {
                            user: {
                                $ref: string;
                            };
                        };
                        required: string[];
                        $ref?: undefined;
                    } | {
                        $ref: string;
                        type?: undefined;
                        properties?: undefined;
                        required?: undefined;
                    })[];
                };
            };
        };
        paths: {
            "/health": {
                get: {
                    tags: string[];
                    summary: string;
                    responses: {
                        "200": {
                            description: string;
                            content: {
                                "application/json": {
                                    schema: {
                                        type: string;
                                    };
                                };
                            };
                        };
                    };
                };
            };
            "/auth/register": {
                post: {
                    tags: string[];
                    summary: string;
                    requestBody: {
                        required: boolean;
                        content: {
                            "application/json": {
                                schema: {
                                    type: string;
                                    properties: {
                                        email: {
                                            type: string;
                                            format: string;
                                        };
                                        password: {
                                            type: string;
                                            minLength: number;
                                        };
                                        name: {
                                            type: string;
                                        };
                                    };
                                    required: string[];
                                };
                            };
                        };
                    };
                    responses: {
                        "201": {
                            description: string;
                            content: {
                                "application/json": {
                                    schema: {
                                        $ref: string;
                                    };
                                };
                            };
                        };
                        "400": {
                            description: string;
                            content: {
                                "application/json": {
                                    schema: {
                                        $ref: string;
                                    };
                                };
                            };
                        };
                        "409": {
                            description: string;
                            content: {
                                "application/json": {
                                    schema: {
                                        $ref: string;
                                    };
                                };
                            };
                        };
                    };
                };
            };
            "/auth/login": {
                post: {
                    tags: string[];
                    summary: string;
                    requestBody: {
                        required: boolean;
                        content: {
                            "application/json": {
                                schema: {
                                    type: string;
                                    properties: {
                                        email: {
                                            type: string;
                                            format: string;
                                        };
                                        password: {
                                            type: string;
                                            minLength: number;
                                        };
                                    };
                                    required: string[];
                                };
                            };
                        };
                    };
                    responses: {
                        "200": {
                            description: string;
                            content: {
                                "application/json": {
                                    schema: {
                                        $ref: string;
                                    };
                                };
                            };
                        };
                        "401": {
                            description: string;
                            content: {
                                "application/json": {
                                    schema: {
                                        $ref: string;
                                    };
                                };
                            };
                        };
                    };
                };
            };
            "/auth/refresh": {
                post: {
                    tags: string[];
                    summary: string;
                    requestBody: {
                        required: boolean;
                        content: {
                            "application/json": {
                                schema: {
                                    type: string;
                                    properties: {
                                        refreshToken: {
                                            type: string;
                                        };
                                    };
                                    required: string[];
                                };
                            };
                        };
                    };
                    responses: {
                        "200": {
                            description: string;
                            content: {
                                "application/json": {
                                    schema: {
                                        $ref: string;
                                    };
                                };
                            };
                        };
                        "401": {
                            description: string;
                            content: {
                                "application/json": {
                                    schema: {
                                        $ref: string;
                                    };
                                };
                            };
                        };
                    };
                };
            };
            "/auth/logout": {
                post: {
                    tags: string[];
                    summary: string;
                    requestBody: {
                        required: boolean;
                        content: {
                            "application/json": {
                                schema: {
                                    type: string;
                                    properties: {
                                        refreshToken: {
                                            type: string;
                                        };
                                    };
                                    required: string[];
                                };
                            };
                        };
                    };
                    responses: {
                        "200": {
                            description: string;
                            content: {
                                "application/json": {
                                    schema: {
                                        type: string;
                                    };
                                };
                            };
                        };
                    };
                };
            };
            "/auth/me": {
                get: {
                    tags: string[];
                    summary: string;
                    security: {
                        bearerAuth: never[];
                    }[];
                    responses: {
                        "200": {
                            description: string;
                            content: {
                                "application/json": {
                                    schema: {
                                        $ref: string;
                                    };
                                };
                            };
                        };
                        "401": {
                            description: string;
                            content: {
                                "application/json": {
                                    schema: {
                                        $ref: string;
                                    };
                                };
                            };
                        };
                    };
                };
            };
        };
    };
    docs(req: any, res: any): void;
}
