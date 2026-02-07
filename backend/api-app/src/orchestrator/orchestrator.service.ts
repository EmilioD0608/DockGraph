import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { TargetsService } from '../targets/targets.service';
import { SshService } from './services/ssh.service';
import { DeployProjectDto } from './dto/deploy-project.dto';
import { CredentialsService } from '../credentials/credentials.service';

@Injectable()
export class OrchestratorService {
    private logger = new Logger(OrchestratorService.name);

    constructor(
        private targetsService: TargetsService,
        private sshService: SshService,
        private credentialsService: CredentialsService,
    ) { }

    /**
     * Injects token into git URL for authentication.
     * https://github.com/user/repo.git -> https://x-access-token:TOKEN@github.com/user/repo.git
     */
    private injectTokenIntoUrl(url: string, token: string): string {
        try {
            const parsed = new URL(url);
            parsed.username = 'x-access-token';
            parsed.password = token;
            return parsed.toString();
        } catch {
            // If URL parsing fails, return as-is
            return url;
        }
    }

    async deployProject(dto: DeployProjectDto, userId: number) {
        this.logger.log(`Starting deployment for Project ${dto.projectId} to Target ${dto.targetId}`);

        // 1. Get Target Credentials (Decrypted & Owned by User)
        const target = await this.targetsService.getDecryptedTargetForUser(dto.targetId, userId);

        if (!target) {
            throw new NotFoundException(`Target with ID ${dto.targetId} not found (or does not belong to you)`);
        }

        // 2. Prepare Connection Config
        const sshConfig: any = {
            host: target.host,
            port: target.port,
            username: target.username,
        };

        if (target.privateKey) {
            sshConfig.privateKey = target.privateKey;
        } else if (target.password) {
            sshConfig.password = target.password;
        } else {
            throw new BadRequestException('Target has no valid authentication method (Key or Password)');
        }

        // 3. Resolve Absolute Remote Path (Use PWD to get absolute home)
        const pwdResult = await this.sshService.executeCommand(sshConfig, 'pwd');
        const userHome = pwdResult.stdout.trim();
        const remoteProjectDir = `${userHome}/dockgraph/projects/${dto.projectId}`;
        const remoteComposeFile = `${remoteProjectDir}/docker-compose.yml`;

        try {
            // 4. Create Remote Directory
            // "mkdir -p" ensures parent dirs exist and no error if dir already exists
            this.logger.debug(`Creating remote directory: ${remoteProjectDir}`);
            await this.sshService.executeCommand(sshConfig, `mkdir -p ${remoteProjectDir}`);

            // Ensure git is installed (only if not present, avoids sudo issues)
            const gitCheck = await this.sshService.executeCommand(sshConfig, `which git || echo "not-found"`);
            if (gitCheck.stdout.includes('not-found')) {
                this.logger.warn('Git not found on server. Attempting install...');
                await this.sshService.executeCommand(sshConfig, `sudo apt-get update && sudo apt-get install -y git`);
            }

            // 5. Git Operations (Optional)
            if (dto.repositoryUrl) {
                const branch = dto.branch || 'main';
                let cloneUrl = dto.repositoryUrl;

                // Inject token for private repos
                if (dto.gitCredentialId) {
                    const token = await this.credentialsService.getDecryptedCredential(dto.gitCredentialId);
                    if (token) {
                        cloneUrl = this.injectTokenIntoUrl(dto.repositoryUrl, token);
                        this.logger.debug('Using authenticated git clone');
                    }
                }

                this.logger.log(`Git Integration: Syncing ${dto.repositoryUrl} on branch ${branch}`);

                // Check if .git exists
                const checkGit = await this.sshService.executeCommand(sshConfig, `cd ${remoteProjectDir} && [ -d .git ] && echo "exists" || echo "not found"`);

                if (checkGit.stdout.trim() === 'exists') {
                    // Pull (token not needed if SSH is configured on server)
                    this.logger.debug('Git repo exists, pulling latest changes...');
                    await this.sshService.executeCommand(sshConfig, `cd ${remoteProjectDir} && git pull origin ${branch}`);
                } else {
                    // Clone
                    this.logger.debug('Cloning fresh repository...');
                    await this.sshService.executeCommand(sshConfig, `cd ${remoteProjectDir} && git clone -b ${branch} ${cloneUrl} .`);
                }
            } else if (dto.polyRepos && dto.polyRepos.length > 0) {
                // PolyRepo Strategy
                this.logger.log(`PolyRepo Strategy: Syncing ${dto.polyRepos.length} repositories`);

                for (const repo of dto.polyRepos) {
                    const folderPath = `${remoteProjectDir}/${repo.folder}`;
                    const branch = repo.branch || 'main';
                    let cloneUrl = repo.repositoryUrl;

                    // Inject token for private repos
                    if (repo.gitCredentialId) {
                        const token = await this.credentialsService.getDecryptedCredential(repo.gitCredentialId);
                        if (token) {
                            cloneUrl = this.injectTokenIntoUrl(repo.repositoryUrl, token);
                            this.logger.debug(`Using authenticated clone for ${repo.folder}`);
                        }
                    }

                    // Check if .git exists in subdir
                    const checkGit = await this.sshService.executeCommand(sshConfig, `[ -d "${folderPath}/.git" ] && echo "exists" || echo "not-found"`);

                    if (checkGit.stdout.includes('exists')) {
                        this.logger.debug(`Updating ${repo.folder}...`);
                        const pullResult = await this.sshService.executeCommand(sshConfig, `cd "${folderPath}" && git pull origin ${branch}`);
                        if (pullResult.code !== 0) {
                            this.logger.warn(`Git pull failed for ${repo.folder}: ${pullResult.stderr}`);
                        }
                    } else {
                        this.logger.debug(`Cloning ${repo.folder} from ${repo.repositoryUrl}...`);
                        // Force clean folder to avoid "exists and is not an empty directory" error
                        const cloneResult = await this.sshService.executeCommand(sshConfig, `rm -rf "${folderPath}" && git clone -b ${branch} ${cloneUrl} "${folderPath}"`);
                        if (cloneResult.code !== 0) {
                            this.logger.error(`Git clone failed for ${repo.folder} (code ${cloneResult.code}): ${cloneResult.stderr}`);
                            throw new Error(`Git clone failed: ${cloneResult.stderr || 'Unknown error'}`);
                        }
                    }
                }
            }

            // 6. Upload YAML (Overrides repo's compose if any)
            this.logger.debug(`Uploading docker-compose.yml`);
            await this.sshService.uploadFileContent(sshConfig, remoteComposeFile, dto.yamlContent);

            // 7. Execute Docker Compose Up
            // Check for docker compose (V2) or docker-compose (V1)
            this.logger.debug(`Checking for Docker availability...`);
            let composeCmd = 'docker compose';
            const v2Check = await this.sshService.executeCommand(sshConfig, 'docker compose version || echo "not-found"');

            if (v2Check.stdout.includes('not-found')) {
                this.logger.debug('Docker V2 (compose) not found, trying V1 (docker-compose)...');
                const v1Check = await this.sshService.executeCommand(sshConfig, 'docker-compose version || echo "not-found"');
                if (v1Check.stdout.includes('not-found')) {
                    throw new Error('Docker is not installed on the target server. Please install Docker and Docker Compose to continue.');
                }
                composeCmd = 'docker-compose';
            }

            this.logger.debug(`Executing ${composeCmd} up`);
            const buildFlag = (dto.repositoryUrl || (dto.polyRepos && dto.polyRepos.length > 0)) ? '--build' : '';
            const result = await this.sshService.executeCommand(
                sshConfig,
                `cd ${remoteProjectDir} && ${composeCmd} up ${buildFlag} -d`
            );

            if (result.code !== 0) {
                throw new Error(`Deployment failed (Exit Code ${result.code}): ${result.stderr || 'Check if Docker service is running'}`);
            }

            this.logger.log(`Deployment Successful!`);

            return {
                status: 'success',
                target: target.name,
                output: result.stdout,
                error: result.stderr
            };

        } catch (error: any) {
            this.logger.error(`Deployment Failed: ${error.message}`);
            throw new BadRequestException(`Deployment failed: ${error.message}`);
        }
    }
}
