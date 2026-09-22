-- Add city column to enquiries (nullable, safe for existing records)
ALTER TABLE "enquiries" ADD COLUMN "city" TEXT;
