-- AlterTable
ALTER TABLE "Supplier" ADD COLUMN     "address" TEXT,
ADD COLUMN     "contactPerson" TEXT,
ADD COLUMN     "email" TEXT,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "rating" DOUBLE PRECISION,
ALTER COLUMN "leadTimeDays" SET DEFAULT 14,
ALTER COLUMN "defectRate" SET DEFAULT 0,
ALTER COLUMN "onTimeDeliveryRate" SET DEFAULT 0.95;
