-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "branch" TEXT DEFAULT 'main',
ADD COLUMN     "repositoryUrl" TEXT;
