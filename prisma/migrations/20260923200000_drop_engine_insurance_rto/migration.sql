-- Remove Engine Specification, Insurance Validity and RTO / Registration
-- fields from cars (feature removed from the Add Car form and backend).
ALTER TABLE "cars" DROP COLUMN IF EXISTS "engine";
ALTER TABLE "cars" DROP COLUMN IF EXISTS "insuranceValidity";
ALTER TABLE "cars" DROP COLUMN IF EXISTS "registrationRTO";
