import { Module } from '@nestjs/common';
import { SshService } from './services/ssh.service';
import { TargetsModule } from '../targets/targets.module';
import { CredentialsModule } from '../credentials/credentials.module';
import { CommonModule } from '../common/common.module';
import { OrchestratorController } from './orchestrator.controller';
import { OrchestratorService } from './orchestrator.service';
import { AuthModule } from '../auth/auth.module';

@Module({
    imports: [TargetsModule, CredentialsModule, CommonModule, AuthModule],
    providers: [SshService, OrchestratorService],
    exports: [SshService],
    controllers: [OrchestratorController],
})
export class OrchestratorModule { }
