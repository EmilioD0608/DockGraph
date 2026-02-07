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
import { CredentialsService } from './credentials.service';
import { CreateCredentialDto } from './dto/create-credential.dto';
import { AuthGuard } from '../auth/auth.guard';

@UseGuards(AuthGuard)
@Controller('credentials')
export class CredentialsController {
  constructor(private readonly credentialsService: CredentialsService) { }

  @Post()
  create(@Body() createCredentialDto: CreateCredentialDto, @Req() req: any) {
    const userId = req.user.sub;
    return this.credentialsService.create(userId, createCredentialDto);
  }

  @Get()
  findAll(@Req() req: any) {
    const userId = req.user.sub;
    return this.credentialsService.findAll(userId);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const userId = req.user.sub;
    return this.credentialsService.remove(id, userId);
  }
}
