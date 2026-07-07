-- AlterTable
ALTER TABLE "Assessment" ADD COLUMN     "classification" TEXT,
ADD COLUMN     "isHiPoException" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Assessment_isHiPoException_idx" ON "Assessment"("isHiPoException");
