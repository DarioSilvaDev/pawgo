# 🚀 Guía de Configuración - PawGo

Esta guía te ayudará a configurar el proyecto desde cero.

## 📋 Prerrequisitos

- **Node.js** 20 o superior
- **Docker y Docker Compose** (para la base de datos)
- **pnpm** (recomendado) o npm/yarn
- **Git**

## 🔧 Instalación Paso a Paso

### 1. Clonar e Instalar Dependencias

```bash
# Instalar dependencias del monorepo
pnpm install
```

### 2. Configurar Base de Datos con Docker

```bash
# Iniciar PostgreSQL con Docker Compose
docker-compose up -d

# Verificar que está corriendo
docker-compose ps

# Ver logs (opcional)
docker-compose logs -f postgres
```

### 3. Configurar Variables de Entorno

```bash
# Opción 1: Usar el script de setup (recomendado)
# Windows:
setup-env.bat

# Linux/Mac:
./setup-env.sh

# Opción 2: Copiar manualmente
# Backend
cp apps/api/env.example.txt apps/api/.env

# Frontend
cp apps/web/env.example.txt apps/web/.env
```

Los archivos `.env` ya estarán configurados con:
- **Backend**: `DATABASE_URL=postgresql://pawgo:pawgo@localhost:5432/pawgo-local`
- **Frontend**: `NEXT_PUBLIC_API_URL=http://localhost:3001`

### 4. Configurar Prisma

```bash
cd apps/api

# Generar cliente Prisma
pnpm prisma generate

# Ejecutar migraciones
pnpm prisma migrate dev --name init
```

### 5. Ejecutar el Proyecto

```bash
# Desde la raíz del proyecto
pnpm dev

# Esto ejecutará:
# - Frontend en http://localhost:3000
# - Backend en http://localhost:3001
```

## 🧪 Verificar que Todo Funciona

### Base de Datos

```bash
# Verificar que el contenedor está corriendo
docker-compose ps

# Conectar a la base de datos (opcional)
docker-compose exec postgres psql -U pawgo -d pawgo-local
```

### Backend

```bash
# Health check
curl http://localhost:3001/health

# Debería responder: {"status":"ok","timestamp":"..."}
```

### Frontend

Abre http://localhost:3000 en tu navegador. Deberías ver la landing page de PawGo.

## 📦 Estructura de Carpetas

```
pawgo/
├── apps/
│   ├── web/              # Next.js frontend
│   │   ├── src/
│   │   │   ├── app/      # App Router pages
│   │   │   ├── components/ # Componentes React
│   │   │   └── lib/      # Utilidades
│   │   └── public/       # Assets estáticos
│   └── api/              # Fastify backend
│       ├── src/
│       │   ├── routes/   # Rutas API
│       │   ├── controllers/ # Controladores
│       │   └── services/ # Lógica de negocio
│       └── prisma/       # Schema y migraciones
└── packages/
    └── shared/           # Tipos y constantes compartidas
```

## 🔍 Comandos Útiles

### Desarrollo

```bash
# Ejecutar todo en desarrollo
pnpm dev

# Solo frontend
cd apps/web && pnpm dev

# Solo backend
cd apps/api && pnpm dev
```

### Base de Datos

```bash
# Iniciar PostgreSQL
docker-compose up -d

# Detener PostgreSQL
docker-compose down

# Detener y eliminar volúmenes (CUIDADO: borra datos)
docker-compose down -v

# Ver logs
docker-compose logs -f postgres

# Conectar a la base de datos
docker-compose exec postgres psql -U pawgo -d pawgo-local

cd apps/api

# Ver datos en Prisma Studio
pnpm prisma studio

# Crear nueva migración
pnpm prisma migrate dev --name nombre_migracion

# Resetear base de datos (CUIDADO: borra datos)
pnpm prisma migrate reset
```

### Build

```bash
# Build de producción
pnpm build

# Build individual
cd apps/web && pnpm build
cd apps/api && pnpm build
```

## 🐛 Solución de Problemas

### Error: Docker no está corriendo

```bash
# Verificar que Docker está corriendo
docker ps

# Si no está corriendo, inicia Docker Desktop
# Luego inicia la base de datos:
docker-compose up -d
```

### Error: Cannot find module '@pawgo/shared'

```bash
# Reconstruir el package shared
cd packages/shared
pnpm build
cd ../..
pnpm install
```

### Error de conexión a PostgreSQL

```bash
# Verificar que el contenedor está corriendo
docker-compose ps

# Si no está corriendo, iniciarlo
docker-compose up -d

# Ver logs para diagnosticar
docker-compose logs postgres

# Verificar que la base de datos existe
docker-compose exec postgres psql -U pawgo -d pawgo-local -c "\dt"
```

### Error: Port already in use

```bash
# Cambiar puerto en .env
PORT=3002  # Para backend
# O cambiar puerto de Next.js
# En apps/web/package.json cambiar "next dev" por "next dev -p 3001"
```

## 📝 Próximos Pasos

1. **Agregar imágenes reales**: Reemplaza los placeholders en `apps/web/public/`
2. **Configurar analytics**: Agrega tus IDs de GA4 y Meta Pixel en `.env`
3. **Personalizar contenido**: Edita los textos en los componentes
4. **Preparar para producción**: Configura variables de entorno de producción

## 🚀 Deploy

### Frontend (Vercel recomendado)

```bash
# Instalar Vercel CLI
npm i -g vercel

# Deploy
cd apps/web
vercel
```

### Backend (Railway, Render, etc.)

1. Conecta tu repositorio
2. Configura variables de entorno
3. Ejecuta migraciones: `pnpm prisma migrate deploy`
4. Deploy automático

## 📚 Recursos

- [Next.js Docs](https://nextjs.org/docs)
- [Fastify Docs](https://www.fastify.io/docs/latest/)
- [Prisma Docs](https://www.prisma.io/docs)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [Docker Compose Docs](https://docs.docker.com/compose/)
