-- CreateTable
CREATE TABLE "ShippingSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "baseCost" DECIMAL(10,2) NOT NULL,
    "perExtraItemCost" DECIMAL(10,2) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShippingSettings_pkey" PRIMARY KEY ("id")
);

-- Строка настроек с текущими захардкоженными значениями (база $12, доп. товар $1),
-- чтобы стоимость доставки не изменилась в момент выката.
INSERT INTO "ShippingSettings" ("id", "baseCost", "perExtraItemCost", "updatedAt")
VALUES ('default', 12, 1, CURRENT_TIMESTAMP);
