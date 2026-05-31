-- AlterTable
ALTER TABLE "Order" ADD COLUMN "orderNumber" SERIAL;

-- CreateIndex
CREATE UNIQUE INDEX "Order_orderNumber_key" ON "Order"("orderNumber");
