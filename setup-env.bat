@echo off
REM Script para configurar archivos .env desde los ejemplos (Windows)

echo 🔧 Configurando archivos .env...

REM Backend
if not exist "apps\api\.env" (
  copy apps\api\env.example.txt apps\api\.env
  echo ✅ Creado apps\api\.env
) else (
  echo ⚠️  apps\api\.env ya existe, omitiendo...
)

REM Frontend
if not exist "apps\web\.env" (
  copy apps\web\env.example.txt apps\web\.env
  echo ✅ Creado apps\web\.env
) else (
  echo ⚠️  apps\web\.env ya existe, omitiendo...
)

echo ✨ Configuración completada!
pause

