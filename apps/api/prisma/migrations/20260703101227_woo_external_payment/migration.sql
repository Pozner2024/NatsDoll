-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "wooOrderId" INTEGER,
ADD COLUMN     "wooOrderKey" TEXT;

-- AlterTable
ALTER TABLE "PaymentSettings" ADD COLUMN     "externalPageEnabled" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "Order_wooOrderId_key" ON "Order"("wooOrderId");
