-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "paymentClaimed" BOOLEAN NOT NULL DEFAULT false;

-- Существующие PENDING-заказы с привязанным PayPal-заказом сегодня показываются как
-- «заявленные» — сохраняем это поведение для старых строк, новые различаются по claim.
UPDATE "Order" SET "paymentClaimed" = true WHERE "paypalOrderId" IS NOT NULL AND "status" = 'PENDING';
