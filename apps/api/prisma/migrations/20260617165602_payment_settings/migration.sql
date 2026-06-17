-- CreateEnum
CREATE TYPE "PaymentMode" AS ENUM ('SANDBOX', 'LIVE');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "paypalCaptureId" TEXT;

-- CreateTable
CREATE TABLE "PaymentSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "mode" "PaymentMode" NOT NULL DEFAULT 'SANDBOX',
    "paypalClientId" TEXT,
    "paypalSecret" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentSettings_pkey" PRIMARY KEY ("id")
);
