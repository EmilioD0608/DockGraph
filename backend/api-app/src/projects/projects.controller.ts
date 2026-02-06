import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { Prisma } from '@prisma/client';
import { AuthGuard } from '../auth/auth.guard';

@UseGuards(AuthGuard)
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) { }

  @Post()
  create(@Body() createProjectDto: Prisma.ProjectCreateInput, @Req() req: any) {
    const userId = req.user.sub;
    return this.projectsService.create(createProjectDto, userId);
  }

  @Get()
  findAll(@Req() req: any) {
    const userId = req.user.sub;
    return this.projectsService.findAll(userId);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const userId = req.user.sub;
    return this.projectsService.findOne(id, userId);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateProjectDto: Prisma.ProjectUpdateInput,
    @Req() req: any,
  ) {
    const userId = req.user.sub;
    return this.projectsService.update(id, updateProjectDto, userId);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const userId = req.user.sub;
    return this.projectsService.remove(id, userId);
  }
}
