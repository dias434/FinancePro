-- CreateEnum
CREATE TYPE "SystemAlertType" AS ENUM ('BUDGET_THRESHOLD', 'BUDGET_OVER_LIMIT', 'GOAL_DUE_SOON', 'GOAL_OVERDUE');

-- CreateEnum
CREATE TYPE "SystemAlertStatus" AS ENUM ('ACTIVE', 'READ', 'RESOLVED');

-- CreateTable
CREATE TABLE "SystemAlert" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "SystemAlertType" NOT NULL,
    "status" "SystemAlertStatus" NOT NULL DEFAULT 'ACTIVE',
    "dedupeKey" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "payload" JSONB,
    "firstTriggeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastTriggeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SystemAlert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SystemAlert_dedupeKey_key" ON "SystemAlert"("dedupeKey");

-- CreateIndex
CREATE INDEX "SystemAlert_userId_status_createdAt_idx" ON "SystemAlert"("userId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "SystemAlert_userId_type_status_idx" ON "SystemAlert"("userId", "type", "status");

-- CreateIndex
CREATE INDEX "SystemAlert_status_lastTriggeredAt_idx" ON "SystemAlert"("status", "lastTriggeredAt");

-- AddForeignKey
ALTER TABLE "SystemAlert" ADD CONSTRAINT "SystemAlert_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
