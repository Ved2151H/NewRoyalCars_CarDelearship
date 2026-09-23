-- Soft-delete (Trash) support: nullable deletedAt on cars + enquiries.
-- Null = active; non-null = in Trash. Safe for existing rows.
ALTER TABLE "cars" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "enquiries" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- Active queries filter on deletedAt = null; trash queries on deletedAt != null.
CREATE INDEX "cars_deletedAt_idx" ON "cars"("deletedAt");
CREATE INDEX "enquiries_deletedAt_idx" ON "enquiries"("deletedAt");
