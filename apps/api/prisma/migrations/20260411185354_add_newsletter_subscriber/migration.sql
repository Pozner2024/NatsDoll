-- DropIndex
DROP INDEX "GalleryItem_gallery_idx";

-- DropIndex
DROP INDEX "Product_isPublished_idx";

-- CreateTable
CREATE TABLE "NewsletterSubscriber" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "subscribedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NewsletterSubscriber_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NewsletterSubscriber_email_key" ON "NewsletterSubscriber"("email");

-- CreateIndex
CREATE INDEX "GalleryItem_gallery_isActive_position_idx" ON "GalleryItem"("gallery", "isActive", "position");

-- CreateIndex
CREATE INDEX "Product_isPublished_deletedAt_idx" ON "Product"("isPublished", "deletedAt");

-- CreateIndex
CREATE INDEX "Review_orderId_idx" ON "Review"("orderId");

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
