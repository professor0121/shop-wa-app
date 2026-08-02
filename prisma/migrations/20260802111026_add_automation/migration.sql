-- CreateTable
CREATE TABLE "Automation" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "triggerType" TEXT NOT NULL,
    "delayHours" INTEGER NOT NULL DEFAULT 24,
    "templateName" TEXT NOT NULL,
    "templateLanguage" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Automation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Automation_shop_triggerType_key" ON "Automation"("shop", "triggerType");
