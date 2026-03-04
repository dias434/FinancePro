type ResolveCorsOriginsInput = {
    nodeEnv?: string | null;
    corsOrigin?: string | null;
    corsOriginsDev?: string | null;
    corsOriginsStaging?: string | null;
    corsOriginsProd?: string | null;
};
export declare function resolveCorsOrigins(input: ResolveCorsOriginsInput): string[];
export {};
