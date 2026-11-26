-- F-11 Pickup time (docs/sprints/sprint-3/F-11-pickup-time.md, BR-14, D-09)
-- Orders stored before F-11 become "as soon as possible" with their submission time.

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "pickupAsap" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "pickupAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "Order" SET "pickupAt" = "createdAt";

-- CreateIndex
CREATE INDEX "Order_status_pickupAt_idx" ON "Order"("status", "pickupAt");
