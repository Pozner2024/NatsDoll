-- AlterTable
ALTER TABLE "NewsletterSubscriber" ADD COLUMN     "confirmedAt" TIMESTAMP(3);

UPDATE "NewsletterSubscriber" SET "confirmedAt" = "subscribedAt";
