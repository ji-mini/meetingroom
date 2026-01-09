/*
  Warnings:

  - You are about to drop the column `location` on the `meeting_rooms` table. All the data in the column will be lost.
  - Added the required column `building` to the `meeting_rooms` table without a default value. This is not possible if the table is not empty.
  - Added the required column `floor` to the `meeting_rooms` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "meeting_rooms" DROP COLUMN "location",
ADD COLUMN     "building" TEXT NOT NULL,
ADD COLUMN     "floor" TEXT NOT NULL;
