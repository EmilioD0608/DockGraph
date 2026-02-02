import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, Project } from '@prisma/client';

@Injectable()
export class ProjectsService {
  constructor(private prisma: PrismaService) {}

  async create(data: Prisma.ProjectCreateInput): Promise<Project> {
    return this.prisma.project.create({
      data,
    });
  }

  async findAll(): Promise<Project[]> {
    return this.prisma.project.findMany();
  }

  async findOne(id: number): Promise<Project | null> {
    return this.prisma.project.findUnique({
      where: { id },
    });
  }

  async findByUuid(uuid: string): Promise<Project | null> {
    return this.prisma.project.findUnique({
      where: { uuid },
    });
  }

  async update(id: number, data: Prisma.ProjectUpdateInput): Promise<Project> {
    return this.prisma.project.update({
      where: { id },
      data,
    });
  }

  async remove(id: number): Promise<Project> {
    return this.prisma.project.delete({
      where: { id },
    });
  }
}
