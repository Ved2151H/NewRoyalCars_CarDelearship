-- Dealership configuration managed in Admin Settings, consumed by the public Contact page.
CREATE TABLE "dealer_settings" (
    "id" TEXT NOT NULL,
    "dealershipName" TEXT NOT NULL,
    "contactPhone" TEXT NOT NULL,
    "supportEmail" TEXT NOT NULL,
    "showroomAddress" TEXT NOT NULL,
    "businessHours" TEXT,
    "whatsappNumber" TEXT,
    "mapsUrl" TEXT,
    "enableInstantSms" BOOLEAN NOT NULL DEFAULT true,
    "enableEmailAlerts" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dealer_settings_pkey" PRIMARY KEY ("id")
);
