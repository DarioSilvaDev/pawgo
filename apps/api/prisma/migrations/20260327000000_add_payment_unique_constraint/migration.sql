-- Migration: add_payment_unique_constraint
-- Fix: Race condition en createPayment
--
-- Previene que dos requests concurrentes creen dos pagos con el mismo método
-- para la misma orden. El constraint (orderId, paymentMethod) garantiza que
-- solo existe UN intento de pago por método por orden en cualquier momento.
--
-- Nota: Si existen datos duplicados (orderId + paymentMethod) deben limpiarse
-- manualmente antes de aplicar esta migración.
-- Query para verificar duplicados:
--   SELECT "orderId", "paymentMethod", COUNT(*)
--   FROM payments
--   GROUP BY "orderId", "paymentMethod"
--   HAVING COUNT(*) > 1;

-- CreateIndex
CREATE UNIQUE INDEX "payments_orderId_paymentMethod_key" ON "payments"("orderId", "paymentMethod");
