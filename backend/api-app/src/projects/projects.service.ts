import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, Project } from '@prisma/client';

@Injectable()
export class ProjectsService {
  constructor(private prisma: PrismaService) { }

  // Modified to link creation to user
  async create(data: Prisma.ProjectCreateInput, userId: number): Promise<Project> {
    return this.prisma.project.create({
      data: {
        ...data,
        user: { connect: { id: userId } }
      },
    });
  }

  async findAll(userId: number): Promise<Project[]> {
    return this.prisma.project.findMany({
      where: { userId }
    });
  }

  async findOne(id: number, userId: number): Promise<Project | null> {
    return this.prisma.project.findFirst({
      where: { id, userId },
    });
  }

  async findByUuid(uuid: string, userId: number): Promise<Project | null> {
    return this.prisma.project.findFirst({
      where: { uuid, userId },
    });
  }

  async update(id: number, data: Prisma.ProjectUpdateInput, userId: number): Promise<Project> {
    // Check ownership exists first
    await this.ensureOwnership(id, userId);
    return this.prisma.project.update({
      where: { id },
      data,
    });
  }

  async remove(id: number, userId: number): Promise<Project> {
    await this.ensureOwnership(id, userId);
    return this.prisma.project.delete({
      where: { id },
    });
  }

  private async ensureOwnership(id: number, userId: number) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      select: { userId: true }
    });

    if (!project) {
      throw new Error('Project not found');
    }

    // If project has no owner, allow the current user to claim it
    if (project.userId === null) {
      await this.prisma.project.update({
        where: { id },
        data: { userId }
      });
      return;
    }

    if (project.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }
  }
}
