module.exports = [
"[externals]/next/dist/compiled/next-server/app-route-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-route-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/@opentelemetry/api [external] (next/dist/compiled/@opentelemetry/api, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/@opentelemetry/api", () => require("next/dist/compiled/@opentelemetry/api"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-page-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-unit-async-storage.external.js [external] (next/dist/server/app-render/work-unit-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-unit-async-storage.external.js", () => require("next/dist/server/app-render/work-unit-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-async-storage.external.js [external] (next/dist/server/app-render/work-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-async-storage.external.js", () => require("next/dist/server/app-render/work-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/shared/lib/no-fallback-error.external.js [external] (next/dist/shared/lib/no-fallback-error.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/shared/lib/no-fallback-error.external.js", () => require("next/dist/shared/lib/no-fallback-error.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/after-task-async-storage.external.js [external] (next/dist/server/app-render/after-task-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/after-task-async-storage.external.js", () => require("next/dist/server/app-render/after-task-async-storage.external.js"));

module.exports = mod;
}),
"[project]/apps/web/lib/auth/backend.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "backendFetch",
    ()=>backendFetch
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$_30616f075156ee3a3a7bc4c619d06b6a$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$server$2d$only$2f$empty$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@16.0.10_@babel+core@7._30616f075156ee3a3a7bc4c619d06b6a/node_modules/next/dist/compiled/server-only/empty.js [app-route] (ecmascript)");
;
function getBackendUrl() {
    const raw = process.env.NEXT_PUBLIC_API_URL ?? process.env.API_URL ?? (("TURBOPACK compile-time truthy", 1) ? "http://localhost:3001" : "TURBOPACK unreachable");
    if (!raw) {
        throw new Error("Missing NEXT_PUBLIC_API_URL (backend base url)");
    }
    let url = raw.trim().replace(/\/$/, "");
    if (!/^https?:\/\//.test(url)) {
        if ("TURBOPACK compile-time truthy", 1) {
            url = `http://${url}`;
        } else //TURBOPACK unreachable
        ;
    }
    return url;
}
async function backendFetch(path, init) {
    const base = getBackendUrl();
    const url = `${base}${path.startsWith("/") ? "" : "/"}${path}`;
    return fetch(url, init);
}
}),
"[project]/apps/web/lib/auth/constants.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ACCESS_TOKEN_MAX_AGE_SECONDS",
    ()=>ACCESS_TOKEN_MAX_AGE_SECONDS,
    "AUTH_COOKIES",
    ()=>AUTH_COOKIES,
    "REFRESH_TOKEN_MAX_AGE_SECONDS",
    ()=>REFRESH_TOKEN_MAX_AGE_SECONDS
]);
const AUTH_COOKIES = {
    access: "fp_access",
    refresh: "fp_refresh"
};
const ACCESS_TOKEN_MAX_AGE_SECONDS = 60 * 15;
const REFRESH_TOKEN_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
}),
"[project]/apps/web/lib/api/server-errors.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "backendUnavailable",
    ()=>backendUnavailable,
    "safeReadBody",
    ()=>safeReadBody
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$_30616f075156ee3a3a7bc4c619d06b6a$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@16.0.10_@babel+core@7._30616f075156ee3a3a7bc4c619d06b6a/node_modules/next/server.js [app-route] (ecmascript)");
;
function backendUnavailable(error) {
    console.error("backend unavailable:", error);
    return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$_30616f075156ee3a3a7bc4c619d06b6a$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
        message: "API indisponível. Confirme se a API está rodando em http://localhost:3001.",
        code: "BACKEND_UNAVAILABLE"
    }, {
        status: 502
    });
}
async function safeReadBody(res) {
    const contentType = res.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
        return await res.json().catch(()=>null);
    }
    return await res.text().catch(()=>null);
}
}),
"[project]/apps/web/app/api/auth/me/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "GET",
    ()=>GET
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$_30616f075156ee3a3a7bc4c619d06b6a$2f$node_modules$2f$next$2f$headers$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@16.0.10_@babel+core@7._30616f075156ee3a3a7bc4c619d06b6a/node_modules/next/headers.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$_30616f075156ee3a3a7bc4c619d06b6a$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@16.0.10_@babel+core@7._30616f075156ee3a3a7bc4c619d06b6a/node_modules/next/server.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$auth$2f$backend$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/lib/auth/backend.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$auth$2f$constants$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/lib/auth/constants.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$api$2f$server$2d$errors$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/web/lib/api/server-errors.ts [app-route] (ecmascript)");
;
;
;
;
;
async function GET() {
    const cookieStore = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$_30616f075156ee3a3a7bc4c619d06b6a$2f$node_modules$2f$next$2f$headers$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["cookies"])();
    const accessToken = cookieStore.get(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$auth$2f$constants$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["AUTH_COOKIES"].access)?.value;
    if (!accessToken) {
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$_30616f075156ee3a3a7bc4c619d06b6a$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            message: "Unauthorized"
        }, {
            status: 401
        });
    }
    let res;
    try {
        res = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$auth$2f$backend$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["backendFetch"])("/auth/me", {
            method: "GET",
            headers: {
                Authorization: `Bearer ${accessToken}`
            },
            cache: "no-store"
        });
    } catch (error) {
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$api$2f$server$2d$errors$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["backendUnavailable"])(error);
    }
    const data = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$web$2f$lib$2f$api$2f$server$2d$errors$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["safeReadBody"])(res);
    if (!res.ok) {
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$_30616f075156ee3a3a7bc4c619d06b6a$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            message: typeof data === "object" && data && "message" in data ? String(data.message) : "Unauthorized"
        }, {
            status: 401
        });
    }
    return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$0$2e$10_$40$babel$2b$core$40$7$2e$_30616f075156ee3a3a7bc4c619d06b6a$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json(data);
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__d1d4b925._.js.map