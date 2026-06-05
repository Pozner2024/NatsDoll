-- CreateEnum
CREATE TYPE "SaleScope" AS ENUM ('ALL', 'CATEGORIES', 'PRODUCTS');

-- CreateTable
CREATE TABLE "Sale" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "discount" INTEGER NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "scope" "SaleScope" NOT NULL,
    "categoryIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "productIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Sale_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Sale_startsAt_endsAt_idx" ON "Sale"("startsAt", "endsAt");
