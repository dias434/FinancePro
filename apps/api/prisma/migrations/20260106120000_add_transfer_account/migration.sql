-- Add transferAccountId to support transfer transactions (source -> destination)
ALTER TABLE "Transaction" ADD COLUMN "transferAccountId" TEXT;

-- Index for filtering by destination account
CREATE INDEX "Transaction_transferAccountId_idx" ON "Transaction"("transferAccountId");

-- Foreign key to Account (destination). Set null on delete to preserve history.
ALTER TABLE "Transaction"
ADD CONSTRAINT "Transaction_transferAccountId_fkey"
FOREIGN KEY ("transferAccountId") REFERENCES "Account"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

