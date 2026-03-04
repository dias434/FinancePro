import { Controller, Get, Req, Res } from "@nestjs/common"

import { buildOpenApiSpec } from "./openapi"

function getBaseUrl(req: any): string {
  const protoHeader = req.headers["x-forwarded-proto"]
  const proto = Array.isArray(protoHeader) ? protoHeader[0] : protoHeader
  const protocol = proto ?? req.protocol ?? "http"

  const hostHeader = req.headers["x-forwarded-host"] ?? req.headers.host
  const host = Array.isArray(hostHeader) ? hostHeader[0] : hostHeader
  if (!host) return ""

  return `${protocol}://${host}`
}

@Controller()
export class DocsController {
  @Get("openapi.json")
  openapi(@Req() req: any) {
    return buildOpenApiSpec(getBaseUrl(req))
  }

  @Get("docs")
  docs(@Req() req: any, @Res() res: any) {
    const baseUrl = getBaseUrl(req)
    const openApiUrl = `${baseUrl}/openapi.json`

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
</html>`)
  }
}
