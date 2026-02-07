import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { OrchestratorService } from './orchestrator.service';
import { DeployProjectDto } from './dto/deploy-project.dto';
import { AuthGuard } from '../auth/auth.guard';

@UseGuards(AuthGuard)
@Controller('orchestrator')
export class OrchestratorController {
    constructor(private readonly orchestratorService: OrchestratorService) { }

    @Post('deploy')
    deploy(@Body() deployProjectDto: DeployProjectDto, @Req() req: any) {
        const userId = req.user.sub;
        return this.orchestratorService.deployProject(deployProjectDto, userId);
    }
}
