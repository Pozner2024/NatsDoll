-- DropIndex
DROP INDEX "CartItem_cartId_productId_key";

-- AlterTable
ALTER TABLE "CartItem" ADD COLUMN     "message" TEXT;

-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "hasMessage" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "messageOptions" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateIndex
CREATE UNIQUE INDEX "CartItem_cartId_productId_message_key" ON "CartItem"("cartId", "productId", "message");
