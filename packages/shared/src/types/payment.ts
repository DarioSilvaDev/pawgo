import { PaymentStatus } from '../enums/payment-status';

// Placeholder para futuro e-commerce con MercadoPago
export interface Payment {
  id: string;
  orderId: string;
  status: PaymentStatus;
  amount: number;
  currency: string;
  mercadoPagoPreferenceId?: string;
  mercadoPagoPaymentId?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePaymentDto {
  orderId: string;
  amount: number;
  currency: string;
}

