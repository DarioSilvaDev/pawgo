/**
 * Script para verificar que todas las variables de entorno necesarias están configuradas
 */

const requiredVars = [
  {
    name: "DATABASE_URL",
    description: "URL de conexión a la base de datos PostgreSQL",
    optional: false,
  },
  {
    name: "MERCADOPAGO_ACCESS_TOKEN",
    description: "Access token de MercadoPago (obtenido del panel de desarrolladores)",
    optional: false,
  },
  {
    name: "API_URL",
    description: "URL pública de la API (necesaria para webhooks). En desarrollo local usa ngrok.",
    optional: false,
  },
  {
    name: "FRONTEND_URL",
    description: "URL del frontend (para redirects después del pago)",
    optional: false,
  },
];

const optionalVars = [
  {
    name: "MERCADOPAGO_WEBHOOK_SECRET",
    description: "Secret para verificación de firma de webhooks (opcional por ahora)",
    optional: true,
  },
  {
    name: "PORT",
    description: "Puerto del servidor (default: 3001)",
    optional: true,
  },
  {
    name: "NODE_ENV",
    description: "Entorno de ejecución (development/production)",
    optional: true,
  },
];

console.log("🔍 Verificando variables de entorno...\n");

let allGood = true;

// Verificar variables requeridas
console.log("📋 Variables Requeridas:");
for (const envVar of requiredVars) {
  const value = process.env[envVar.name];
  if (!value || value.trim() === "") {
    console.log(`  ❌ ${envVar.name}: NO CONFIGURADA`);
    console.log(`     ${envVar.description}`);
    allGood = false;
  } else {
    // Ocultar valores sensibles
    const displayValue =
      envVar.name === "MERCADOPAGO_ACCESS_TOKEN" ||
      envVar.name === "DATABASE_URL"
        ? `${value.substring(0, 10)}...`
        : value;
    console.log(`  ✅ ${envVar.name}: ${displayValue}`);
  }
}

console.log("\n📋 Variables Opcionales:");
for (const envVar of optionalVars) {
  const value = process.env[envVar.name];
  if (!value || value.trim() === "") {
    console.log(`  ⚠️  ${envVar.name}: No configurada (opcional)`);
    console.log(`     ${envVar.description}`);
  } else {
    console.log(`  ✅ ${envVar.name}: ${value}`);
  }
}

console.log("\n" + "=".repeat(50));

if (allGood) {
  console.log("✅ Todas las variables requeridas están configuradas");
  console.log("\n🚀 Puedes ejecutar el servidor con: pnpm run dev");
  console.log("\n📖 Para probar la Fase 1, consulta: docs/TESTING_FASE1.md");
  process.exit(0);
} else {
  console.log("❌ Faltan variables de entorno requeridas");
  console.log("\n💡 Crea un archivo .env en apps/api/ con las variables necesarias.");
  console.log("   Puedes usar apps/api/env.example.txt como referencia.");
  process.exit(1);
}
