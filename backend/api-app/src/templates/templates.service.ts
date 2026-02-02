import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, Template } from '@prisma/client';

@Injectable()
export class TemplatesService {
  constructor(private prisma: PrismaService) {}

  async create(data: Prisma.TemplateCreateInput): Promise<Template> {
    return this.prisma.template.create({
      data,
    });
  }

  async findAll(): Promise<Template[]> {
    return this.prisma.template.findMany();
  }

  async findOne(id: number): Promise<Template | null> {
    return this.prisma.template.findUnique({
      where: { id },
    });
  }

  async findByUuid(uuid: string): Promise<Template | null> {
    return this.prisma.template.findUnique({
      where: { uuid },
    });
  }

  async update(
    id: number,
    data: Prisma.TemplateUpdateInput,
  ): Promise<Template> {
    return this.prisma.template.update({
      where: { id },
      data,
    });
  }

  async remove(id: number): Promise<Template> {
    return this.prisma.template.delete({
      where: { id },
    });
  }
}
