-- Terminology + field changes for cars (all non-destructive to car data):
--   1. Remove Car Number / License Plate: drop the unique + regular indexes
--      first, then the "carNumber" column itself. No other car field touched.
--   2. "Model" becomes "Variant": rename the column in place so every existing
--      value is preserved exactly.
--   3. Add "insurance" (Valid / Lapsed): nullable text so existing rows are
--      simply NULL until an admin edits the car.

-- Drop indexes that reference "carNumber" BEFORE dropping the column.
DROP INDEX IF EXISTS "cars_carNumber_key";
DROP INDEX IF EXISTS "cars_carNumber_idx";

-- Remove the license-plate field (existing values retire with the feature;
-- no other record data is changed).
ALTER TABLE "cars" DROP COLUMN IF EXISTS "carNumber";

-- Model -> Variant (in-place rename; data preserved).
ALTER TABLE "cars" RENAME COLUMN "model" TO "variant";

-- New Insurance dropdown field (nullable; existing cars keep all data).
ALTER TABLE "cars" ADD COLUMN IF NOT EXISTS "insurance" TEXT;
