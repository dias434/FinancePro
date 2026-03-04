-- CreateEnum
CREATE TYPE "ImportFormat" AS ENUM ('CSV', 'OFX');

-- CreateEnum
CREATE TYPE "ImportStatus" AS ENUM ('COMPLETED', 'FAILED', 'ROLLED_BACK');

-- CreateEnum
CREATE TYPE "ImportItemStatus" AS ENUM ('IMPORTED', 'DUPLICATE', 'ERROR', 'ROLLED_BACK');

-- CreateTable
CREATE TABLE "ImportLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "format" "ImportFormat" NOT NULL,
    "fileName" TEXT NOT NULL,
    "status" "ImportStatus" NOT NULL DEFAULT 'COMPLETED',
    "mapping" JSONB,
    "defaults" JSONB,
    "totalRows" INTEGER NOT NULL DEFAULT 0,
    "importedRows" INTEGER NOT NULL DEFAULT 0,
    "duplicateRows" INTEGER NOT NULL DEFAULT 0,
    "errorRows" INTEGER NOT NULL DEFAULT 0,
    "replayedFromId" TEXT,
    "completedAt" TIMESTAMP(3),
    "rolledBackAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ImportLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportLogItem" (
    "id" TEXT NOT NULL,
    "importLogId" TEXT NOT NULL,
    "rowIndex" INTEGER NOT NULL,
    "status" "ImportItemStatus" NOT NULL,
    "dedupeKey" TEXT,
    "raw" JSONB,
    "normalized" JSONB,
    "errorMessage" TEXT,
    "transactionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ImportLogItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ImportLog_userId_createdAt_idx" ON "ImportLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ImportLog_userId_status_createdAt_idx" ON "ImportLog"("userId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "ImportLogItem_importLogId_rowIndex_idx" ON "ImportLogItem"("importLogId", "rowIndex");

-- CreateIndex
CREATE INDEX "ImportLogItem_importLogId_status_idx" ON "ImportLogItem"("importLogId", "status");

-- CreateIndex
CREATE INDEX "ImportLogItem_transactionId_idx" ON "ImportLogItem"("transactionId");

-- AddForeignKey
ALTER TABLE "ImportLog" ADD CONSTRAINT "ImportLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportLog" ADD CONSTRAINT "ImportLog_replayedFromId_fkey" FOREIGN KEY ("replayedFromId") REFERENCES "ImportLog"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportLogItem" ADD CONSTRAINT "ImportLogItem_importLogId_fkey" FOREIGN KEY ("importLogId") REFERENCES "ImportLog"("id") ON DELETE CASCADE ON UPDATE CASCADE;
