import * as assert from "node:assert/strict"
import { describe, it } from "node:test"

import { resolveCorsOrigins } from "../../src/common/http/cors.config"

describe("resolveCorsOrigins", () => {
  it("usa CORS_ORIGIN como override explicito", () => {
    const result = resolveCorsOrigins({
      nodeEnv: "production",
      corsOrigin: "https://custom.financepro.app",
      corsOriginsProd: "https://financepro.app",
    })

    assert.deepEqual(result, ["https://custom.financepro.app"])
  })

  it("usa lista de desenvolvimento quando NODE_ENV=development", () => {
    const result = resolveCorsOrigins({
      nodeEnv: "development",
      corsOriginsDev: "http://localhost:3000, http://localhost:19006",
    })

    assert.deepEqual(result, ["http://localhost:3000", "http://localhost:19006"])
  })

  it("falha em staging sem origem configurada", () => {
    assert.throws(
      () =>
        resolveCorsOrigins({
          nodeEnv: "staging",
          corsOriginsStaging: "",
        }),
      /Missing CORS origin configuration/,
    )
  })

  it("bloqueia wildcard em producao", () => {
    assert.throws(
      () =>
        resolveCorsOrigins({
          nodeEnv: "production",
          corsOriginsProd: "*",
        }),
      /wildcard/i,
    )
  })

  it("aplica fallback local em desenvolvimento sem configuracao", () => {
    const result = resolveCorsOrigins({ nodeEnv: "development" })
    assert.deepEqual(result, ["http://localhost:3000", "http://localhost:19006"])
  })
})
