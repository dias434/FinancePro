"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocsController = void 0;
const common_1 = require("@nestjs/common");
const openapi_1 = require("./openapi");
function getBaseUrl(req) {
    const protoHeader = req.headers["x-forwarded-proto"];
    const proto = Array.isArray(protoHeader) ? protoHeader[0] : protoHeader;
    const protocol = proto ?? req.protocol ?? "http";
    const hostHeader = req.headers["x-forwarded-host"] ?? req.headers.host;
    const host = Array.isArray(hostHeader) ? hostHeader[0] : hostHeader;
    if (!host)
        return "";
    return `${protocol}://${host}`;
}
let DocsController = class DocsController {
    openapi(req) {
        return (0, openapi_1.buildOpenApiSpec)(getBaseUrl(req));
    }
    docs(req, res) {
        const baseUrl = getBaseUrl(req);
        const openApiUrl = `${baseUrl}/openapi.json`;
        res.type("text/html").send(`<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>FinancePro API Docs</title>
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
    <style>
      body { margin: 0; background: #0b0b12; }
      .offline { font-family: ui-sans-serif, system-ui; color: #e5e7eb; padding: 16px; }
      a { color: #93c5fd; }
    </style>
  </head>
  <body>
    <div id="swagger-ui"></div>
    <noscript>
      <div class="offline">Ative JavaScript para ver a documentação. OpenAPI: <a href="/openapi.json">/openapi.json</a></div>
    </noscript>
    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script>
      (function () {
        if (!window.SwaggerUIBundle) {
          var el = document.getElementById("swagger-ui");
          el.innerHTML = '<div class="offline">Swagger UI não carregou. OpenAPI: <a href="/openapi.json">/openapi.json</a></div>';
          return;
        }
        window.SwaggerUIBundle({
          url: ${JSON.stringify(openApiUrl)},
          dom_id: "#swagger-ui",
          deepLinking: true,
          displayRequestDuration: true,
          persistAuthorization: true
        });
      })();
    </script>
  </body>
</html>`);
    }
};
exports.DocsController = DocsController;
__decorate([
    (0, common_1.Get)("openapi.json"),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], DocsController.prototype, "openapi", null);
__decorate([
    (0, common_1.Get)("docs"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], DocsController.prototype, "docs", null);
exports.DocsController = DocsController = __decorate([
    (0, common_1.Controller)()
], DocsController);
