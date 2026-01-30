import { MercadoPagoConfig, Preference, Payment } from "mercadopago";
import { Order, OrderItem } from "../../../../packages/shared/dist/index.js";

const ACCESS_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN || "";

if (!ACCESS_TOKEN) {
  console.warn(
    "⚠️ MERCADOPAGO_ACCESS_TOKEN no configurado. La integración con MercadoPago no funcionará."
  );
}

const client = new MercadoPagoConfig({
  accessToken: ACCESS_TOKEN,
  options: {
    timeout: 5000,
    idempotencyKey: "abc",
  },
});

const preferenceClient = new Preference(client);
const paymentClient = new Payment(client);

export interface PaymentPreference {
  id: string;
  initPoint: string; // URL de pago
  sandboxInitPoint?: string;
}

export interface PaymentStatus {
  id: string;
  status: string;
  statusDetail: string;
  transactionAmount: number;
  currencyId: string;
}

export class MercadoPagoService {
  /**
   * Create payment preference for an order
   */
  async createPreference(
    order: Order & { id: string },
    successUrl: string,
    failureUrl: string,
    pendingUrl: string
  ): Promise<PaymentPreference> {
    if (!ACCESS_TOKEN) {
      throw new Error("MercadoPago no está configurado");
    }

    const orderItems = (order.items as unknown) as OrderItem[];
    const items = orderItems.map((item) => ({
      id: item.productId,
      title: `${item.productName}${item.variantName ? ` - ${item.variantName}` : ""}`,
      description: item.size || item.variantName || item.productName,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      currency_id: order.currency,
    }));

    // Add shipping cost as an item if exists
    if (order.shippingCost > 0) {
      items.push({
        id: "shipping",
        title: "Costo de envío",
        description: order.shippingMethod || "Envío",
        quantity: 1,
        unit_price: order.shippingCost,
        currency_id: order.currency,
      });
    }

    // Validate URLs are not empty
    if (!successUrl || !failureUrl || !pendingUrl) {
      throw new Error("Las URLs de retorno (success, failure, pending) son requeridas");
    }

    const preferenceData: {
      items: any[];
      payer: { email?: string };
      back_urls: { success: string; failure: string; pending: string };
      external_reference: string;
      notification_url: string;
      statement_descriptor: string;
      metadata: { order_id: string };
    } = {
      items,
      payer: {
        email: order.leadId ? undefined : undefined, // TODO: Get email from lead if available
      },
      back_urls: {
        success: successUrl,
        failure: failureUrl,
        pending: pendingUrl,
      },
      external_reference: order.id,
      notification_url: `${process.env.API_URL || "http://localhost:3001"}/api/webhooks/mercadopago`,
      statement_descriptor: "PAWGO",
      metadata: {
        order_id: order.id,
      },
    };

    // Note: auto_return is removed because MercadoPago has issues with it in some configurations
    // The user will still be redirected using back_urls after payment
    // If you need auto_return, ensure URLs are publicly accessible (not localhost)

    try {
      console.log("[MercadoPago] Creating preference with URLs:", {
        success: successUrl,
        failure: failureUrl,
        pending: pendingUrl,
      });

      const preference = await preferenceClient.create({ body: preferenceData });

      console.log("[MercadoPago] Preference created successfully:", {
        preferenceId: preference.id,
        initPoint: preference.init_point,
      });

      return {
        id: preference.id || "",
        initPoint: preference.init_point || "",
        sandboxInitPoint: preference.sandbox_init_point,
      };
    } catch (error: any) {
      console.error("[MercadoPago] Error creating preference:", {
        error: error?.message || "Unknown error",
        errorCode: error?.error,
        status: error?.status,
        urls: {
          success: successUrl,
          failure: failureUrl,
          pending: pendingUrl,
        },
      });
      
      // Provide more specific error message
      if (error?.error === "invalid_auto_return") {
        throw new Error(
          `Error en configuración de URLs de retorno: ${error.message}. Verifica que FRONTEND_URL esté configurado correctamente.`
        );
      }
      
      throw new Error(
        `Error al crear preferencia de pago: ${error instanceof Error ? error.message : "Error desconocido"}`
      );
    }
  }

  /**
   * Get payment status
   */
  async getPaymentStatus(paymentId: string): Promise<PaymentStatus | null> {
    if (!ACCESS_TOKEN) {
      throw new Error("MercadoPago no está configurado");
    }

    try {
      const payment = await paymentClient.get({ id: paymentId });

      return {
        id: payment.id?.toString() || "",
        status: payment.status || "",
        statusDetail: payment.status_detail || "",
        transactionAmount: payment.transaction_amount || 0,
        currencyId: payment.currency_id || "ARS",
      };
    } catch (error) {
      console.error("Error getting payment status:", error);
      return null;
    }
  }

  /**
   * Process webhook notification
   */
  async processWebhook(data: {
    type: string;
    data: { id: string; external_reference?: string };
  }): Promise<{ paymentId: string; status: string; orderId?: string } | null> {
    if (!ACCESS_TOKEN) {
      throw new Error("MercadoPago no está configurado");
    }

    // Handle payment notifications
    if (data.type === "payment") {
      const paymentId = data.data.id;
      
      // Get full payment details to extract external_reference (orderId)
      let orderId: string | undefined = data.data.external_reference;
      
      try {
        const payment = await paymentClient.get({ id: paymentId });
        
        // Extract orderId from external_reference or metadata
        if (!orderId && payment.external_reference) {
          orderId = payment.external_reference;
        } else if (!orderId && payment.metadata) {
          const metadata = payment.metadata as { order_id?: string };
          orderId = metadata?.order_id;
        }
        
        const paymentStatus = await this.getPaymentStatus(paymentId);

        if (!paymentStatus) {
          return null;
        }

        return {
          paymentId,
          status: paymentStatus.status,
          orderId,
        };
      } catch (error) {
        console.error("Error getting payment details:", error);
        // Fallback: try to get status anyway
        const paymentStatus = await this.getPaymentStatus(paymentId);
        if (!paymentStatus) {
          return null;
        }
        return {
          paymentId,
          status: paymentStatus.status,
          orderId,
        };
      }
    }

    return null;
  }

  /**
   * Verify webhook signature (if MercadoPago provides it)
   */
  verifyWebhookSignature(
    payload: string,
    signature: string
  ): boolean {
    console.log("🚀 ~ MercadoPagoService ~ verifyWebhookSignature ~ signature:", signature)
    console.log("🚀 ~ MercadoPagoService ~ verifyWebhookSignature ~ payload:", payload)
    // TODO: Implement signature verification if MercadoPago provides it
    // For now, we'll trust the webhook (not recommended for production)
    return true;
  }

  /**
   * Create transfer to influencer (for paying commissions)
   */
  async createTransfer(
    amount: number,
    recipientEmail: string,
    description: string
  ): Promise<{ id: string; status: string }> {
    console.log("🚀 ~ MercadoPagoService ~ createTransfer ~ description:", description)
    console.log("🚀 ~ MercadoPagoService ~ createTransfer ~ recipientEmail:", recipientEmail)
    console.log("🚀 ~ MercadoPagoService ~ createTransfer ~ amount:", amount)
    if (!ACCESS_TOKEN) {
      throw new Error("MercadoPago no está configurado");
    }

    // Note: MercadoPago transfers require special permissions and setup
    // This is a placeholder for the implementation
    // You may need to use MercadoPago's Payout API or another method

    throw new Error(
      "Transferencias a influencers mediante MercadoPago requieren configuración adicional. Por favor, usa transferencia bancaria."
    );
  }
}

