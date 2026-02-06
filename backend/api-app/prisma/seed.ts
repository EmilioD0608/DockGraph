import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import 'dotenv/config';
import * as bcrypt from 'bcrypt';

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
      description:
        'A pre-configured PostgreSQL database with volume and environment variables.',
      category: 'Database',
      config: {
        image: 'postgres:15-alpine',
        environment: {
          POSTGRES_USER: 'admin',
          POSTGRES_PASSWORD: '${DB_PASSWORD}',
          POSTGRES_DB: 'app_db',
        },
        volumes: ['pg_data:/var/lib/postgresql/data'],
        ports: ['5432:5432'],
        restart: 'unless-stopped',
        healthcheck: {
          test: ['CMD-SHELL', 'pg_isready -U admin'],
          interval: '10s',
          timeout: '5s',
          retries: 5,
        },
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
          PGRST_DB_ANON_ROLE: 'anon',
        },
        ports: ['3000:3000'],
        depends_on: ['postgres-db'],
        restart: 'unless-stopped',
      },
    },
    {
      name: 'Secure Node/Angular Stack',
      description:
        'Angular frontend (public), Node.js backend (internal), PostgreSQL (internal).',
      category: 'Stack',
      config: {
        services: {
          frontend: {
            build: './frontend',
            ports: ['4200:4200'],
            stdin_open: true,
            tty: true,
            networks: ['public_net', 'internal_net'],
            depends_on: ['backend'],
            restart: 'unless-stopped',
          },
          backend: {
            build: './backend',
            ports: ['3000:3000'],
            networks: ['internal_net'],
            environment: {
              DB_HOST: 'db',
              DB_PORT: '5432',
              DB_User: 'admin',
              DB_PASS: '${DB_PASSWORD}',
            },
            depends_on: {
              db: {
                condition: 'service_healthy',
              },
            },
            restart: 'unless-stopped',
          },
          db: {
            image: 'postgres:15-alpine',
            networks: ['internal_net'],
            environment: {
              POSTGRES_USER: 'admin',
              POSTGRES_PASSWORD: '${DB_PASSWORD}',
              POSTGRES_DB: 'app_db',
            },
            volumes: ['db_data:/var/lib/postgresql/data'],
            restart: 'unless-stopped',
            healthcheck: {
              test: ['CMD-SHELL', 'pg_isready -U admin'],
              interval: '10s',
              timeout: '5s',
              retries: 5,
            },
          },
        },
        networks: {
          public_net: {
            driver: 'bridge',
          },
          internal_net: {
            internal: true,
          },
        },
        volumes: {
          db_data: {},
        },
      },
    },
    {
      name: 'Python API & Angular',
      description:
        'Angular Frontend connected to a Python API and PostgreSQL database.',
      category: 'Stack',
      config: {
        services: {
          frontend: {
            build: './frontend',
            ports: ['4200:4200'],
            stdin_open: true,
            tty: true,
            networks: ['app_net'],
            depends_on: ['api'],
            restart: 'unless-stopped',
          },
          api: {
            build: './api',
            ports: ['5000:5000'],
            networks: ['app_net'],
            environment: {
              DATABASE_URL: 'postgresql://user:${DB_PASSWORD}@db:5432/mydb',
            },
            depends_on: {
              db: {
                condition: 'service_healthy',
              },
            },
            restart: 'unless-stopped',
          },
          db: {
            image: 'postgres:15',
            networks: ['app_net'],
            environment: {
              POSTGRES_USER: 'user',
              POSTGRES_PASSWORD: '${DB_PASSWORD}',
              POSTGRES_DB: 'mydb',
            },
            volumes: ['pg_data:/var/lib/postgresql/data'],
            restart: 'unless-stopped',
            healthcheck: {
              test: ['CMD-SHELL', 'pg_isready -U user'],
              interval: '10s',
              timeout: '5s',
              retries: 5,
            },
          },
        },
        networks: {
          app_net: {},
        },
        volumes: {
          pg_data: {},
        },
      },
    },
    {
      name: 'MERN Stack',
      description: 'Refactored MERN stack with Docker best practices.',
      category: 'Stack',
      config: {
        services: {
          mongo: {
            image: 'mongo:6.0',
            restart: 'unless-stopped',
            volumes: ['mongo_data:/data/db'],
            networks: ['mern_net'],
            healthcheck: {
              test: ['CMD', 'mongosh', '--eval', "db.adminCommand('ping')"],
              interval: '10s',
              timeout: '5s',
              retries: 5,
            },
          },
          client: {
            build: './client',
            restart: 'unless-stopped',
            ports: ['3000:3000'],
            stdin_open: true,
            tty: true,
            depends_on: ['server'],
            networks: ['mern_net'],
          },
          server: {
            build: './server',
            restart: 'unless-stopped',
            ports: ['5000:5000'],
            environment: {
              MONGO_URI: 'mongodb://mongo:27017/mern_db',
            },
            depends_on: {
              mongo: {
                condition: 'service_healthy',
              },
            },
            networks: ['mern_net'],
          },
        },
        volumes: {
          mongo_data: {},
        },
        networks: {
          mern_net: {},
        },
      },
    },
    {
      name: 'MERN + Mongo Express',
      description: 'MERN Stack with Mongo Express for database visualization.',
      category: 'Stack',
      config: {
        services: {
          mongo: {
            image: 'mongo:6.0',
            restart: 'unless-stopped',
            volumes: ['mongo_data:/data/db'],
            networks: ['mern_net'],
            healthcheck: {
              test: ['CMD', 'mongosh', '--eval', "db.adminCommand('ping')"],
              interval: '10s',
              timeout: '5s',
              retries: 5,
            },
          },
          client: {
            build: './client',
            restart: 'unless-stopped',
            ports: ['3000:3000'],
            stdin_open: true,
            tty: true,
            depends_on: ['server'],
            networks: ['mern_net'],
          },
          server: {
            build: './server',
            restart: 'unless-stopped',
            ports: ['5000:5000'],
            environment: {
              MONGO_URI: 'mongodb://mongo:27017/mern_db',
            },
            depends_on: {
              mongo: {
                condition: 'service_healthy',
              },
            },
            networks: ['mern_net'],
          },
          'mongo-express': {
            image: 'mongo-express',
            restart: 'unless-stopped',
            ports: ['8081:8081'],
            environment: {
              ME_CONFIG_MONGODB_SERVER: 'mongo',
            },
            depends_on: {
              mongo: {
                condition: 'service_healthy',
              },
            },
            networks: ['mern_net'],
          },
        },
        volumes: {
          mongo_data: {},
        },
        networks: {
          mern_net: {},
        },
      },
    },
    {
      name: 'MERN + Redis',
      description: 'MERN Stack with Redis for caching.',
      category: 'Stack',
      config: {
        services: {
          mongo: {
            image: 'mongo:6.0',
            restart: 'unless-stopped',
            volumes: ['mongo_data:/data/db'],
            networks: ['mern_net'],
            healthcheck: {
              test: ['CMD', 'mongosh', '--eval', "db.adminCommand('ping')"],
              interval: '10s',
              timeout: '5s',
              retries: 5,
            },
          },
          client: {
            build: './client',
            restart: 'unless-stopped',
            ports: ['3000:3000'],
            stdin_open: true,
            tty: true,
            depends_on: ['server'],
            networks: ['mern_net'],
          },
          server: {
            build: './server',
            restart: 'unless-stopped',
            ports: ['5000:5000'],
            environment: {
              MONGO_URI: 'mongodb://mongo:27017/mern_db',
              REDIS_URL: 'redis://redis:6379',
            },
            depends_on: {
              mongo: {
                condition: 'service_healthy',
              },
              redis: {
                condition: 'service_healthy',
              },
            },
            networks: ['mern_net'],
          },
          redis: {
            image: 'redis:alpine',
            restart: 'unless-stopped',
            networks: ['mern_net'],
            healthcheck: {
              test: ['CMD', 'redis-cli', 'ping'],
              interval: '10s',
              timeout: '5s',
              retries: 5,
            },
          },
        },
        volumes: {
          mongo_data: {},
        },
        networks: {
          mern_net: {},
        },
      },
    },
    {
      name: 'MERN + Nginx',
      description: 'MERN Stack with Nginx as a reverse proxy.',
      category: 'Stack',
      config: {
        services: {
          mongo: {
            image: 'mongo:6.0',
            restart: 'unless-stopped',
            volumes: ['mongo_data:/data/db'],
            networks: ['mern_net'],
            healthcheck: {
              test: ['CMD', 'mongosh', '--eval', "db.adminCommand('ping')"],
              interval: '10s',
              timeout: '5s',
              retries: 5,
            },
          },
          nginx: {
            image: 'nginx:latest',
            restart: 'unless-stopped',
            ports: ['80:80'],
            volumes: ['./nginx/nginx.conf:/etc/nginx/conf.d/default.conf'],
            depends_on: ['client', 'server'],
            networks: ['mern_net'],
          },
          client: {
            build: {
              context: './client',
            },
            restart: 'unless-stopped',
            stdin_open: true,
            tty: true,
            depends_on: ['server'],
            networks: ['mern_net'],
          },
          server: {
            build: {
              context: './server',
            },
            restart: 'unless-stopped',
            environment: {
              MONGO_URI: 'mongodb://mongo:27017/mern_db',
            },
            depends_on: {
              mongo: {
                condition: 'service_healthy',
              },
            },
            networks: ['mern_net'],
          },
        },
        volumes: {
          mongo_data: {},
        },
        networks: {
          mern_net: {},
        },
      },
    },
  ];


  // Create Default User
  const hashedPassword = await bcrypt.hash('password123', 10);
  const defaultUser = await prisma.user.upsert({
    where: { email: 'user@example.com' },
    update: {
      password: hashedPassword // Ensure existing user gets hashed password update if re-running seed
    },
    create: {
      email: 'user@example.com',
      password: hashedPassword,
    },
  });
  console.log(`Default user ensured: ${defaultUser.email}`);

  for (const data of templates) {
    // Buscamos por nombre para evitar duplicados
    const existing = await prisma.template.findFirst({
      where: { name: data.name },
    });

    if (existing) {
      const updated = await prisma.template.update({
        where: { id: existing.id },
        data: {
          description: data.description,
          category: data.category,
          config: data.config ?? {},
          isPublic: true
        },
      });
      console.log(`Updated template: ${updated.name}`);
    } else {
      const created = await prisma.template.create({
        data: { ...data, isPublic: true },
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
