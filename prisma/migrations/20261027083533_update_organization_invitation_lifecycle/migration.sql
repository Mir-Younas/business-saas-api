-- AlterTable
ALTER TABLE "OrganizationInvitation" ADD COLUMN     "respondedAt" TIMESTAMP(3),
ALTER COLUMN "tokenHash" DROP NOT NULL;
