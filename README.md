# Guía de Despliegue del Proyecto

Este proyecto consiste en una aplicación completa formada por un Backend (NestJS) y un Frontend (Angular).

## Estructura del Proyecto

- **Backend**: Ubicado en `backend/api-app`. Construido con NestJS, Prisma y PostgreSQL.
- **Frontend**: Ubicado en `DockGraph`. Construido con Angular 21.

---

## Prerrequisitos

Antes de comenzar, asegúrate de tener instalado lo siguiente:

- **Node.js** (versión LTS recomendada, v18 o superior)
- **PostgreSQL** (Base de datos)
- **npm** (Gestor de paquetes)

---

## 1. Configuración del Backend

El backend gestiona la API y la conexión con la base de datos.

### Pasos:

1.  **Navegar al directorio del backend:**
    ```bash
    cd backend/api-app
    ```

2.  **Instalar dependencias:**
    ```bash
    npm install
    ```

3.  **Configurar variables de entorno:**
    Crea un archivo `.env` en la raíz de `backend/api-app` basándote en la siguiente configuración (ajusta las credenciales según tu entorno):

    ```env
    # backend/api-app/.env
    DATABASE_URL="postgresql://usuario:password@localhost:5432/nombre_base_datos?schema=public"
    ```

    *Nota: Asegúrate de que la base de datos PostgreSQL esté corriendo y sea accesible.*

4.  **Ejecutar migraciones y seed (semilla) de datos:**
    Esto creará las tablas necesarias e insertará datos iniciales.
    ```bash
    npx prisma migrate dev --name init
    
    # Para poblar la base de datos (Seed):
    # Opción A (si está configurado en package.json):
    npx prisma db seed
    
    # Opción B (manual):
    npx ts-node prisma/seed.ts
    ```

5.  **Iniciar el servidor en desarrollo:**
    ```bash
    npm run start:dev
    ```
    El servidor debería estar corriendo en `http://localhost:3000`.

---

## 2. Configuración del Frontend

El frontend es la interfaz de usuario de la aplicación.

### Pasos:

1.  **Navegar al directorio del frontend:**
    ```bash
    cd DockGraph
    ```

2.  **Instalar dependencias:**
    ```bash
    npm install
    ```

    *Nota: Si encuentras problemas de versiones, verifica que estás usando una versión de Node compatible con Angular 21.*

3.  **Configurar la API URL (si es necesario):**
    Por defecto, el servicio apunta a `http://localhost:3000`. Si tu backend está en otro puerto o host, edita el archivo:
    `src/app/services/template.service.ts` (u otros servicios que realicen peticiones HTTP).

4.  **Iniciar el servidor de desarrollo:**
    ```bash
    npm start
    # O comando alternativo
    ng serve
    ```
    La aplicación estará disponible en `http://localhost:4200`.

---

## 3. Despliegue en Producción

Para entornos de producción, se recomienda compilar los proyectos y servirlos de manera optimizada.

### Backend (Producción)

1.  **Compilar el proyecto:**
    ```bash
    cd backend/api-app
    npm run build
    ```

2.  **Iniciar el servidor compilado:**
    ```bash
    npm run start:prod
    ```
    *Se recomienda usar un gestor de procesos como PM2 para mantener la aplicación viva.*

### Frontend (Producción)

1.  **Compilar el proyecto:**
    ```bash
    cd DockGraph
    npm run build
    ```
    Esto generará los archivos estáticos en la carpeta `dist/DockGraph`.

2.  **Servir los archivos estáticos:**
    Puedes usar servidores web como Nginx, Apache, o servirlo desde el mismo backend de NestJS (configurando `ServeStaticModule`).

    **Ejemplo con http-server (para pruebas locales de la build):**
    ```bash
    npx http-server dist/DockGraph
    ```

---

## Comandos Útiles

- **Verificar Prisma Studio:** Visualiza tus datos de forma sencilla.
  ```bash
  cd backend/api-app
  npx prisma studio
  ```
- **Linting:** Revisa la calidad del código.
  ```bash
  npm run lint
  ```
