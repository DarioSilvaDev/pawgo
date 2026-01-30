import { fetchAPI } from "./auth";

export interface OrderItem {
  productId: string;
  variantId?: string;
  quantity: number;
}

export interface CreateOrderDto {
  leadId?: string;
  items: OrderItem[];
  shippingAddress?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  shippingMethod?: string;
  discountCode?: string;
}

export interface Order {
  id: string;
  leadId?: string;
  discountCodeId?: string;
  status: string;
  subtotal: number;
  discount: number;
  shippingCost: number;
  total: number;
  currency: string;
  items: any[];
  shippingAddress?: any;
  shippingMethod?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Simulate complete order creation with payment (for testing)
 */
export async function simulateCompleteOrder(
  data: CreateOrderDto
): Promise<{
  order: Order;
  payment: {
    id: string;
    status: string;
    amount: number;
    currency: string;
    simulated: boolean;
  };
  message: string;
}> {
  const response = await fetchAPI("/orders/simulate", {
    method: "POST",
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      error: "Error desconocido",
    }));
    throw new Error(error.error || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}

/**
 * Create order
 */
export async function createOrder(data: CreateOrderDto): Promise<Order> {
  const response = await fetchAPI("/orders", {
    method: "POST",
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      error: "Error desconocido",
    }));
    throw new Error(error.error || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}

/**
 * Get order by ID
 */
export async function getOrder(id: string): Promise<Order> {
  const response = await fetchAPI(`/orders/${id}`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      error: "Error desconocido",
    }));
    throw new Error(error.error || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}

/**
 * Create payment preference for an order
 */
export async function createPayment(orderId: string): Promise<{
  paymentId: string;
  paymentLink: string;
  preferenceId: string;
}> {
  const response = await fetchAPI(`/orders/${orderId}/payment`, {
    method: "POST",
    body: JSON.stringify({}), // Empty body to satisfy Fastify's Content-Type requirement
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      error: "Error desconocido",
    }));
    throw new Error(error.error || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}

/**
 * Get payment status
 */
export async function getPaymentStatus(paymentId: string): Promise<any> {
  const response = await fetchAPI(`/payments/${paymentId}/status`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      error: "Error desconocido",
    }));
    throw new Error(error.error || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}
