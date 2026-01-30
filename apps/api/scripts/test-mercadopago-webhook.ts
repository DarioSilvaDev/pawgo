/**
 * Script de prueba para el webhook de MercadoPago (Fase 1)
 * 
 * Este script simula un webhook de MercadoPago para probar el flujo completo.
 * 
 * Uso:
 * 1. Asegúrate de tener todas las variables de entorno configuradas
 * 2. Crea una orden y un pago primero
 * 3. Ejecuta: tsx scripts/test-mercadopago-webhook.ts <orderId> <paymentId>
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function testWebhook(orderId: string, mercadoPagoPaymentId: string) {
  console.log("🧪 Testing MercadoPago Webhook (Fase 1)");
  console.log("==========================================\n");

  try {
    // Verificar que la orden existe
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!order) {
      console.error(`❌ Orden ${orderId} no encontrada`);
      process.exit(1);
    }

    console.log(`✅ Orden encontrada: ${orderId}`);
    console.log(`   Estado actual: ${order.status}`);
    console.log(`   Total: $${order.total}`);
    console.log(`   Pagos asociados: ${order.payments.length}\n`);

    if (order.payments.length === 0) {
      console.error("❌ No hay pagos asociados a esta orden");
      console.log("   Primero crea un pago con: POST /api/orders/:id/payment");
      process.exit(1);
    }

    const payment = order.payments[0];
    console.log(`✅ Pago encontrado: ${payment.id}`);
    console.log(`   Estado actual: ${payment.status}`);
    console.log(`   MercadoPago Preference ID: ${payment.mercadoPagoPreferenceId || 'N/A'}`);
    console.log(`   MercadoPago Payment ID: ${payment.mercadoPagoPaymentId || 'N/A'}\n`);

    // Simular webhook de MercadoPago
    const webhookUrl = process.env.API_URL || "http://localhost:3001";
    const webhookEndpoint = `${webhookUrl}/api/webhooks/mercadopago`;

    console.log("📤 Enviando webhook simulado...");
    console.log(`   URL: ${webhookEndpoint}`);
    console.log(`   Payment ID: ${mercadoPagoPaymentId}`);
    console.log(`   Order ID (external_reference): ${orderId}\n`);

    const webhookPayload = {
      type: "payment",
      data: {
        id: mercadoPagoPaymentId,
        external_reference: orderId,
      },
    };

    const response = await fetch(webhookEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(webhookPayload),
    });

    const responseData = await response.json();
    
    console.log(`📥 Respuesta del webhook:`);
    console.log(`   Status: ${response.status}`);
    console.log(`   Body:`, JSON.stringify(responseData, null, 2));
    console.log();

    if (response.status === 200) {
      console.log("✅ Webhook procesado exitosamente\n");

      // Esperar un momento para que se procese
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Verificar estado actualizado
      const updatedOrder = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          payments: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      });

      if (updatedOrder) {
        const updatedPayment = updatedOrder.payments[0];
        console.log("📊 Estado después del webhook:");
        console.log(`   Orden estado: ${updatedOrder.status} ${updatedOrder.status !== order.status ? '✅ (cambió)' : ''}`);
        console.log(`   Pago estado: ${updatedPayment.status} ${updatedPayment.status !== payment.status ? '✅ (cambió)' : ''}`);
        console.log(`   MercadoPago Payment ID: ${updatedPayment.mercadoPagoPaymentId || 'N/A'} ${updatedPayment.mercadoPagoPaymentId !== payment.mercadoPagoPaymentId ? '✅ (actualizado)' : ''}`);
        
        if (updatedOrder.status === "paid") {
          console.log("\n🎉 ¡Orden marcada como pagada!");
          console.log("   Esto debería haber disparado:");
          console.log("   - Actualización de stock");
          console.log("   - Creación de comisiones (si aplica)");
          console.log("   - Email de confirmación");
        }
      }
    } else {
      console.error("❌ Error al procesar webhook");
    }
  } catch (error) {
    console.error("❌ Error:", error);
    if (error instanceof Error) {
      console.error("   Mensaje:", error.message);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Obtener argumentos de línea de comandos
const args = process.argv.slice(2);

if (args.length < 2) {
  console.log("📖 Uso: tsx scripts/test-mercadopago-webhook.ts <orderId> <mercadoPagoPaymentId>");
  console.log("\nEjemplo:");
  console.log("  tsx scripts/test-mercadopago-webhook.ts clx1234567890abcdef 1234567890");
  console.log("\nNota: El mercadoPagoPaymentId puede ser cualquier ID de prueba.");
  console.log("      En producción, este ID vendría de MercadoPago.");
  process.exit(1);
}

const [orderId, mercadoPagoPaymentId] = args;

testWebhook(orderId, mercadoPagoPaymentId)
  .then(() => {
    console.log("\n✅ Prueba completada");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Prueba fallida:", error);
    process.exit(1);
  });
