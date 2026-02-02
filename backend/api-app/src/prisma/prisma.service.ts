import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor(configService: ConfigService) {
    // 1. Configurar la conexión a Postgres
    const connectionString = configService.get<string>('DATABASE_URL');

    // 2. Crear el Pool y el Adaptador (igual que en seed.ts)
    const pool = new Pool({ connectionString });
    const adapter = new PrismaPg(pool);

    // 3. Pasar el adaptador al constructor de PrismaClient mediante super()
    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
