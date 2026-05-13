import { MercadoPagoConfig, Preference, Payment } from "mercadopago";
import { Order, OrderItem, PaymentType } from "../shared/index.js";
import { envs } from "../config/envs.js";

const ACCESS_TOKEN = envs.MERCADOPAGO_ACCESS_TOKEN || "";

if (!ACCESS_TOKEN) {
  console.warn(
    "⚠️ MERCADOPAGO_ACCESS_TOKEN no configurado. La integración con MercadoPago no funcionará."
  );
}

const CARD_ALLOWED_PAYMENT_TYPE_IDS = new Set([
  "credit_card",
  "debit_card",
  "prepaid_card",
  "account_money",
]);

const CARD_BLOCKED_FOR_CASH_PAYMENT_TYPE_IDS = new Set([
  "credit_card",
  "debit_card",
  "prepaid_card",
]);

const client = new MercadoPagoConfig({
  accessToken: ACCESS_TOKEN,
  options: {
    timeout: 5000,
  },
});

const preferenceClient = new Preference(client);
const paymentClient = new Payment(client);

export interface PaymentPreference {
  id: string;
  initPoint: string;
  sandboxInitPoint?: string;
}

export interface PaymentStatus {
  id: string;
  status: string;
  statusDetail: string;
  transactionAmount: number;
  currencyId: string;
  externalReference: string | undefined;
  paymentTypeId?: string;
}

export class MercadoPagoService {
  private buildPaymentMethodsByType(paymentType: PaymentType) {
    if (paymentType === "cash") {
      return {
        installments: 1,
        default_installments: 1,
        excluded_payment_types: [
          { id: "credit_card" },
          { id: "debit_card" },
          { id: "prepaid_card" },
        ],
      };
    }

    return {
      installments: 6,
      default_installments: 6,
      excluded_payment_types: [
        { id: "ticket" },
        { id: "atm" },
        { id: "bank_transfer" },
      ],
    };
  }

  isPaymentTypeCompatible(orderPaymentType: PaymentType, mpPaymentTypeId?: string | null): boolean {
    if (!mpPaymentTypeId) {
      return true;
    }

    if (orderPaymentType === "card") {
      return CARD_ALLOWED_PAYMENT_TYPE_IDS.has(mpPaymentTypeId);
    }

    return !CARD_BLOCKED_FOR_CASH_PAYMENT_TYPE_IDS.has(mpPaymentTypeId);
  }

  async createPreference(
    order: Order & { id: string },
    successUrl: string,
    failureUrl: string,
    pendingUrl: string
  ): Promise<PaymentPreference> {
    if (!ACCESS_TOKEN) {
      throw new Error("MercadoPago no está configurado");
    }

    const orderPaymentType: PaymentType = order.paymentType ?? "card";
    const orderItems = order.items as unknown as OrderItem[];

    const items: Array<{
      id: string;
      title: string;
      description: string;
      quantity: number;
      unit_price: number;
      currency_id: string;
      picture_url?: string;
      category_id: string;
    }> = orderItems.map((item) => ({
      id: item.productId,
      title: item.productName || "Producto de Pawgo",
      description: item.variantName || item.productName || "Producto de Pawgo",
      quantity: item.quantity,
      unit_price: item.unitPrice,
      currency_id: order.currency,
      picture_url: item.imageUrl,
      category_id: "animals_pet_supplies",
    }));

    if (order.shippingCost > 0) {
      items.push({
        id: "shipping",
        title: "Costo de envío",
        description: order.shippingMethod || "Envío",
        quantity: 1,
        unit_price: order.shippingCost,
        currency_id: order.currency,
        category_id: "shipping",
      });
    }

    if (order.discount && order.discount > 0) {
      items.push({
        id: "discount",
        title: "Descuento aplicado",
        description: "Cupón de descuento",
        quantity: 1,
        unit_price: -Math.abs(order.discount),
        currency_id: order.currency,
        category_id: "others",
      });
    }

    if (!successUrl || !failureUrl || !pendingUrl) {
      throw new Error("Las URLs de retorno (success, failure, pending) son requeridas");
    }

    const preferenceData: any = {
      items,
      payer: {
        email: order.payerEmail || undefined,
      },
      back_urls: {
        success: successUrl,
        failure: failureUrl,
        pending: pendingUrl,
      },
      auto_return: "approved",
      external_reference: order.id,
      notification_url: `${envs.API_URL}/api/webhooks/mercadopago?source_news=webhooks`,
      statement_descriptor: "PAWGO",
      payment_methods: this.buildPaymentMethodsByType(orderPaymentType),
      metadata: {
        order_id: order.id,
        payment_type: orderPaymentType,
      },
    };

    try {
      console.log("[MercadoPago] Creating preference", {
        orderId: order.id,
        paymentType: orderPaymentType,
        success: successUrl,
        failure: failureUrl,
        pending: pendingUrl,
      });

      const preference = await preferenceClient.create({ body: preferenceData });

      return {
        id: preference.id || "",
        initPoint: preference.init_point || "",
        sandboxInitPoint: preference.sandbox_init_point,
      };
    } catch (error: unknown) {
      console.log("🚀 ~ MercadoPagoService ~ createPreference ~ error:", error)
      console.error("[MercadoPago] Error creating preference", {
        error: error instanceof Error ? error.message : "Unknown error",
        orderId: order.id,
        paymentType: orderPaymentType,
      });

      throw new Error(
        `Error al crear preferencia de pago: ${error instanceof Error ? error.message : "Error desconocido"}`
      );
    }
  }

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
        externalReference: payment.external_reference,
        currencyId: payment.currency_id || "ARS",
        paymentTypeId: payment.payment_type_id,
      };
    } catch (error) {
      console.error("Error getting payment status:", error);
      return null;
    }
  }

  async processWebhook(data: {
    type: string;
    data: { id: string; external_reference?: string };
  }): Promise<{ paymentId: string; status: string; orderId?: string; paymentTypeId?: string } | null> {
    if (!ACCESS_TOKEN) {
      throw new Error("MercadoPago no está configurado");
    }

    if (data.type !== "payment") {
      console.log(`[MercadoPago] Ignoring webhook type: ${data.type}`);
      return null;
    }

    const paymentId = data.data.id;
    let orderId: string | undefined = data.data.external_reference;

    try {
      const payment = await paymentClient.get({ id: paymentId });

      if (!orderId && payment.external_reference) {
        orderId = payment.external_reference;
      } else if (!orderId && payment.metadata) {
        const metadata = payment.metadata as { order_id?: string };
        orderId = metadata?.order_id;
      }

      const paymentStatus = await this.getPaymentStatus(paymentId);

      if (!paymentStatus) {
        console.warn(`[MercadoPago] Could not get status for payment ${paymentId}`);
        return null;
      }

      return {
        paymentId,
        status: paymentStatus.status,
        orderId,
        paymentTypeId: paymentStatus.paymentTypeId,
      };
    } catch (error) {
      console.error(`[MercadoPago] Error getting payment details for ${paymentId}:`, error);
      const paymentStatus = await this.getPaymentStatus(paymentId);
      if (!paymentStatus) {
        return null;
      }
      return {
        paymentId,
        status: paymentStatus.status,
        orderId,
        paymentTypeId: paymentStatus.paymentTypeId,
      };
    }
  }

  async createTransfer(
    amount: number,
    recipientEmail: string,
    description: string
  ): Promise<{ id: string; status: string }> {
    console.log("🚀 ~ MercadoPagoService ~ createTransfer ~ description:", description);
    console.log("🚀 ~ MercadoPagoService ~ createTransfer ~ recipientEmail:", recipientEmail);
    console.log("🚀 ~ MercadoPagoService ~ createTransfer ~ amount:", amount);
    if (!ACCESS_TOKEN) {
      throw new Error("MercadoPago no está configurado");
    }

    throw new Error(
      "Transferencias a influencers mediante MercadoPago requieren configuración adicional. Por favor, usa transferencia bancaria."
    );
  }
}
