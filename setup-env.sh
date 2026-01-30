#!/bin/bash

# Script para configurar archivos .env desde los ejemplos

echo "🔧 Configurando archivos .env..."

# Backend
if [ ! -f "apps/api/.env" ]; then
  cp apps/api/env.example.txt apps/api/.env
  echo "✅ Creado apps/api/.env"
else
  echo "⚠️  apps/api/.env ya existe, omitiendo..."
fi

# Frontend
if [ ! -f "apps/web/.env" ]; then
  cp apps/web/env.example.txt apps/web/.env
  echo "✅ Creado apps/web/.env"
else
  echo "⚠️  apps/web/.env ya existe, omitiendo..."
fi

echo "✨ Configuración completada!"

