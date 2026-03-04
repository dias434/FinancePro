"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveCorsOrigins = resolveCorsOrigins;
function normalizeEnv(value) {
    return (value ?? "development").trim().toLowerCase();
}
function parseOrigins(raw) {
    if (!raw)
        return [];
    const items = raw
        .split(",")
        .map((item) => item.trim())
        .filter((item) => item.length > 0);
    return Array.from(new Set(items));
}
function isStrictEnv(env) {
    return env === "staging" || env === "production";
}
function resolveCorsOrigins(input) {
    const env = normalizeEnv(input.nodeEnv);
    const explicitOrigins = parseOrigins(input.corsOrigin);
    const selectedOrigins = explicitOrigins.length > 0
        ? explicitOrigins
        : env === "production"
            ? parseOrigins(input.corsOriginsProd)
            : env === "staging"
                ? parseOrigins(input.corsOriginsStaging)
                : parseOrigins(input.corsOriginsDev);
    if (isStrictEnv(env) && selectedOrigins.includes("*")) {
        throw new Error(`CORS wildcard (*) is not allowed for NODE_ENV=${env}`);
    }
    if (selectedOrigins.length > 0) {
        return selectedOrigins;
    }
    if (isStrictEnv(env)) {
        const key = env === "production" ? "CORS_ORIGINS_PROD" : "CORS_ORIGINS_STAGING";
        throw new Error(`Missing CORS origin configuration for NODE_ENV=${env}. Configure ${key}.`);
    }
    return ["http://localhost:3000", "http://localhost:19006"];
}
