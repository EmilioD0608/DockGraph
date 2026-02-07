-- CreateEnum
CREATE TYPE "RepoStrategy" AS ENUM ('MONOREPO', 'POLYREPO');

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "gitCredentialId" INTEGER,
ADD COLUMN     "repoStrategy" "RepoStrategy" NOT NULL DEFAULT 'MONOREPO';

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_gitCredentialId_fkey" FOREIGN KEY ("gitCredentialId") REFERENCES "Credential"("id") ON DELETE SET NULL ON UPDATE CASCADE;
