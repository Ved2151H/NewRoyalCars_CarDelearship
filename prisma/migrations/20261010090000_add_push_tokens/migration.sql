-- FCM device tokens for authorized New Royal Cars admin devices.
--
-- Purely additive: this migration only CREATEs a new table (plus its indexes).
-- No existing table, column, constraint or row is touched, so every existing
-- feature (cars, images, enquiries, customers, settings, trash, auth) behaves
-- exactly as before.

CREATE TABLE "push_tokens" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "platform" TEXT NOT NULL DEFAULT 'android',
    "adminId" TEXT,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "push_tokens_pkey" PRIMARY KEY ("id")
);

-- One row per device: re-registering the same device upserts instead of duplicating.
CREATE UNIQUE INDEX "push_tokens_token_key" ON "push_tokens"("token");

CREATE INDEX "push_tokens_adminId_idx" ON "push_tokens"("adminId");
