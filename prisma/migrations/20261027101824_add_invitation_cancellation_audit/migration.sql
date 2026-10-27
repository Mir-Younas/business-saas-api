-- AlterTable
ALTER TABLE "OrganizationInvitation" ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "cancelledByUserId" TEXT;

-- CreateIndex
CREATE INDEX "OrganizationInvitation_cancelledByUserId_idx" ON "OrganizationInvitation"("cancelledByUserId");

-- AddForeignKey
ALTER TABLE "OrganizationInvitation" ADD CONSTRAINT "OrganizationInvitation_cancelledByUserId_fkey" FOREIGN KEY ("cancelledByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
