-- AlterTable: add per-mode credential columns
ALTER TABLE "PaymentSettings" ADD COLUMN     "sandboxClientId" TEXT;
ALTER TABLE "PaymentSettings" ADD COLUMN     "sandboxSecret" TEXT;
ALTER TABLE "PaymentSettings" ADD COLUMN     "sandboxWebhookId" TEXT;
ALTER TABLE "PaymentSettings" ADD COLUMN     "liveClientId" TEXT;
ALTER TABLE "PaymentSettings" ADD COLUMN     "liveSecret" TEXT;
ALTER TABLE "PaymentSettings" ADD COLUMN     "liveWebhookId" TEXT;

-- Data migration: move existing credentials into the currently active mode's columns
UPDATE "PaymentSettings"
SET "sandboxClientId" = "paypalClientId",
    "sandboxSecret" = "paypalSecret",
    "sandboxWebhookId" = "paypalWebhookId"
WHERE "mode" = 'SANDBOX';

UPDATE "PaymentSettings"
SET "liveClientId" = "paypalClientId",
    "liveSecret" = "paypalSecret",
    "liveWebhookId" = "paypalWebhookId"
WHERE "mode" = 'LIVE';

-- Drop old single-set columns
ALTER TABLE "PaymentSettings" DROP COLUMN "paypalClientId";
ALTER TABLE "PaymentSettings" DROP COLUMN "paypalSecret";
ALTER TABLE "PaymentSettings" DROP COLUMN "paypalWebhookId";
