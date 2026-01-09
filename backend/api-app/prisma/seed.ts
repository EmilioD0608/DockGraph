import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

// --- INICIO DE LA CORRECCIÓN DE CONEXIÓN ---
const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

// Pasamos el adapter. Si lo dejas vacío, fallará.
const prisma = new PrismaClient({ adapter });
// --- FIN DE LA CORRECCIÓN DE CONEXIÓN ---

async function main() {
    const templates = [
        {
            name: 'PostgreSQL Database',
            description: 'A pre-configured PostgreSQL database with volume and environment variables.',
            category: 'Database',
            config: {
                image: 'postgres:15-alpine',
                environment: {
                    POSTGRES_USER: 'admin',
                    POSTGRES_PASSWORD: 'password',
                    POSTGRES_DB: 'app_db',
                },
                volumes: ['pg_data:/var/lib/postgresql/data'],
                ports: ['5432:5432'],
                restart: 'always'
            },
        },
        {
            name: 'PostgREST API',
            description: 'REST API web server for PostgreSQL.',
            category: 'Backend',
            config: {
                image: 'postgrest/postgrest:latest',
                environment: {
                    PGRST_DB_URI: 'postgres://admin:password@postgres-db:5432/app_db',
                    PGRST_DB_SCHEMA: 'public',
                    PGRST_DB_ANON_ROLE: 'anon'
                },
                ports: ['3000:3000'],
                depends_on: ['postgres-db'],
                restart: 'always'
            },
        }
    ];

    for (const data of templates) {
        // Buscamos por nombre para evitar duplicados
        const existing = await prisma.template.findFirst({
            where: { name: data.name }
        });

        if (existing) {
            const updated = await prisma.template.update({
                where: { id: existing.id },
                data: {
                    description: data.description,
                    category: data.category,
                    config: data.config ?? {} // Aseguramos que config no sea undefined si es opcional
                }
            });
            console.log(`Updated template: ${updated.name}`);
        } else {
            const created = await prisma.template.create({
                data
            });
            console.log(`Created template: ${created.name}`);
        }
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });