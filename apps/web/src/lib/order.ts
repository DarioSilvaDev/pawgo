import { fetchAPI } from "./auth";

export interface OrderItem {
  productId: string;
  variantId?: string;
  quantity: number;
}

export interface CustomerInfo {
  name: string;
  lastName: string;
  dni: string;
  phoneNumber: string;
  email: string;
}

export interface CreateOrderDto {
  leadId?: string;
  customerInfo?: CustomerInfo;
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

export interface Payment {
  id: string;
  status: string;
  amount: number;
  currency: string;
  paymentMethod?: string;
  paymentLink?: string;
  mercadoPagoPreferenceId?: string;
  mercadoPagoPaymentId?: string;
  mercadoPagoStatus?: string;
}

export interface Lead {
  id: string;
  email: string;
  name?: string;
  dogSize?: string;
  createdAt: Date;
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
  payments?: Payment[];
  shippingAddress?: any;
  shippingMethod?: string;
  createdAt: Date;
  updatedAt: Date;
  lead?: Lead;
  discountCode?: {
    id: string;
    code: string;
    discountType: string;
    discountValue: number;
  };
}

export interface OrdersResponse {
  orders: Order[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
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

/**
 * Get all orders (admin only)
 */
export async function getAllOrders(options?: {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
}): Promise<OrdersResponse> {
  const params = new URLSearchParams();
  if (options?.page) params.append("page", options.page.toString());
  if (options?.limit) params.append("limit", options.limit.toString());
  if (options?.status) params.append("status", options.status);
  if (options?.search) params.append("search", options.search);

  const queryString = params.toString();
  const url = `/orders${queryString ? `?${queryString}` : ""}`;

  const response = await fetchAPI(url);

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      error: "Error desconocido",
    }));
    throw new Error(error.error || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}

/**
 * Get order details with lead information (admin only)
 */
export async function getOrderDetails(id: string): Promise<Order> {
  const response = await fetchAPI(`/orders/${id}/details`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      error: "Error desconocido",
    }));
    throw new Error(error.error || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}
