import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
} from '@nestjs/common';
import { TemplatesService } from './templates.service';
import { Prisma } from '@prisma/client';

@Controller('templates')
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  @Post()
  create(@Body() createTemplateDto: Prisma.TemplateCreateInput) {
    return this.templatesService.create(createTemplateDto);
  }

  @Get()
  findAll() {
    return this.templatesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.templatesService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateTemplateDto: Prisma.TemplateUpdateInput,
  ) {
    return this.templatesService.update(id, updateTemplateDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.templatesService.remove(id);
  }
}
