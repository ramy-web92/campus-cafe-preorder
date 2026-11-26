-- F-10 Simulated payment (docs/sprints/sprint-2/F-10-payment.md, BR-13)
-- Existing orders become UNPAID, which is true: Sprint 1 had no payment.

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('UNPAID', 'PAID', 'REFUNDED');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "paidAt" TIMESTAMP(3),
ADD COLUMN     "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'UNPAID';
