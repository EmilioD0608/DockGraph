import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
  Req,
  ParseIntPipe,
} from '@nestjs/common';
import { TargetsService } from './targets.service';
import { CreateTargetDto } from './dto/create-target.dto';
import { AuthGuard } from '../auth/auth.guard';

@UseGuards(AuthGuard)
@Controller('targets')
export class TargetsController {
  constructor(private readonly targetsService: TargetsService) { }

  @Post()
  create(@Body() createTargetDto: CreateTargetDto, @Req() req: any) {
    const userId = req.user.sub;
    return this.targetsService.create(userId, createTargetDto);
  }

  @Get()
  findAll(@Req() req: any) {
    const userId = req.user.sub;
    return this.targetsService.findAll(userId);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const userId = req.user.sub;
    return this.targetsService.findOne(id, userId);
  }

  // Not implementing Update for now. Typically easier to delete and re-create if credentials change.
  // Or specific endpoints for rotating keys.

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const userId = req.user.sub;
    return this.targetsService.remove(id, userId);
  }
}
