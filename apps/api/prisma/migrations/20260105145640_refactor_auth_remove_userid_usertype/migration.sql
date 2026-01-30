/*
  Warnings:

  - You are about to drop the column `email` on the `admins` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `auth` table. All the data in the column will be lost.
  - You are about to drop the column `userType` on the `auth` table. All the data in the column will be lost.
  - You are about to drop the column `email` on the `influencers` table. All the data in the column will be lost.
  - Made the column `authId` on table `influencers` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "influencers" DROP CONSTRAINT "influencers_authId_fkey";

-- DropIndex
DROP INDEX "admins_email_key";

-- DropIndex
DROP INDEX "auth_userId_userType_idx";

-- DropIndex
DROP INDEX "influencers_email_key";

-- AlterTable
ALTER TABLE "admins" DROP COLUMN "email";

-- AlterTable
ALTER TABLE "auth" DROP COLUMN "userId",
DROP COLUMN "userType";

-- AlterTable
ALTER TABLE "influencers" DROP COLUMN "email",
ALTER COLUMN "authId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "influencers" ADD CONSTRAINT "influencers_authId_fkey" FOREIGN KEY ("authId") REFERENCES "auth"("id") ON DELETE CASCADE ON UPDATE CASCADE;
