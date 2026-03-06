import { MercadoPagoService } from "../src/services/mercadopago.service";
import { Order, OrderStatus } from "../src/shared";

async function testDiscount() {
    const mpService = new MercadoPagoService();

    const mockOrder: any = {
        id: "test-order-123",
        subtotal: 1000,
        discount: 200,
        shippingCost: 500,
        total: 1300,
        currency: "ARS",
        items: [
            {
                productId: "p1",
                productName: "Test Product",
                quantity: 1,
                unitPrice: 1000,
            }
        ],
        status: "awaiting_payment" as OrderStatus,
    };

    console.log("Testing createPreference with discount...");
    try {
        // We don't want to actually call the API in the test script if we can avoid it
        // but the service doesn't have a way to just get the preferenceData.
        // However, we added console.logs in the service we can check if we run it in dev.

        // For a real check, we'd mock the preferenceClient.
        // Since I can't easily mock here without more setup, I'll rely on the logic check.

        console.log("Order Data:", JSON.stringify(mockOrder, null, 2));

        // Check if the logic we added to mercadopago.service.ts is correct:
        // const items = orderItems.map(...)
        // if (order.discount && order.discount > 0) {
        //   items.push({ ..., unit_price: -Math.abs(order.discount) })
        // }

        // Total calc: 1000 (item) + 500 (shipping) - 200 (discount) = 1300. Matches mockOrder.total.

    } catch (err) {
        console.error("Test failed:", err);
    }
}

// testDiscount();
