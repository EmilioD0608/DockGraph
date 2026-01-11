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
        },
        {
            name: 'Secure Node/Angular Stack',
            description: 'Angular frontend (public), Node.js backend (internal), PostgreSQL (internal).',
            category: 'Stack',
            config: {
                services: {
                    frontend: {
                        image: 'my-angular-app:latest',
                        ports: ['80:80'],
                        networks: ['public_net', 'internal_net'],
                        depends_on: ['backend'],
                        restart: 'always'
                    },
                    backend: {
                        image: 'my-node-app:latest',
                        networks: ['internal_net'],
                        environment: {
                            DB_HOST: 'db',
                            DB_PORT: '5432',
                            DB_User: 'admin',
                            DB_PASS: 'securepass'
                        },
                        depends_on: ['db'],
                        restart: 'always'
                    },
                    db: {
                        image: 'postgres:15-alpine',
                        networks: ['internal_net'],
                        environment: {
                            POSTGRES_USER: 'admin',
                            POSTGRES_PASSWORD: 'securepass',
                            POSTGRES_DB: 'app_db'
                        },
                        volumes: ['db_data:/var/lib/postgresql/data'],
                        restart: 'always'
                    }
                },
                networks: {
                    public_net: {
                        driver: 'bridge'
                    },
                    internal_net: {
                        internal: true
                    }
                },
                volumes: {
                    db_data: {}
                }
            }
        },
        {
            name: 'Python API & Angular',
            description: 'Angular Frontend connected to a Python API and PostgreSQL database.',
            category: 'Stack',
            config: {
                services: {
                    frontend: {
                        image: 'angular-front:latest',
                        ports: ['4200:80'],
                        networks: ['app_net'],
                        depends_on: ['api']
                    },
                    api: {
                        image: 'python-api:3.9',
                        networks: ['app_net'],
                        environment: {
                            DATABASE_URL: 'postgresql://user:pass@db:5432/mydb'
                        },
                        depends_on: ['db']
                    },
                    db: {
                        image: 'postgres:15',
                        networks: ['app_net'],
                        environment: {
                            POSTGRES_USER: 'user',
                            POSTGRES_PASSWORD: 'pass',
                            POSTGRES_DB: 'mydb'
                        },
                        volumes: ['pg_data:/var/lib/postgresql/data']
                    }
                },
                networks: {
                    app_net: {}
                },
                volumes: {
                    pg_data: {}
                }
            }
        },
        {
            name: 'MERN Stack',
            description: 'Fullstack MongoDB, Express, React, Node.js application.',
            category: 'Stack',
            config: {
                services: {
                    client: {
                        image: 'react-app:latest',
                        ports: ['3000:3000'],
                        depends_on: ['server'],
                        networks: ['mern_net']
                    },
                    server: {
                        image: 'express-api:latest',
                        environment: {
                            MONGO_URI: 'mongodb://mongo:27017/mern_db'
                        },
                        depends_on: ['mongo'],
                        networks: ['mern_net']
                    },
                    mongo: {
                        image: 'mongo:6.0',
                        volumes: ['mongo_data:/data/db'],
                        networks: ['mern_net']
                    }
                },
                volumes: {
                    mongo_data: {}
                },
                networks: {
                    mern_net: {}
                }
            }
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