import { OrderStatus } from '../enums/order-status';

export interface Order {
  id: string;
  leadId?: string;
  discountCodeId?: string;
  status: OrderStatus;
  subtotal: number; // Total antes de descuentos
  discount: number; // Descuento total aplicado
  shippingCost: number;
  total: number; // Subtotal - discount + shippingCost
  currency: string;
  items: OrderItem[];
  shippingAddress?: Address;
  shippingMethod?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderItem {
  productId: string;
  variantId?: string; // ID de la variante (tamaño)
  productName: string; // Nombre del producto
  variantName?: string; // Nombre de la variante (ej: "Grande")
  size?: string; // Tamaño específico
  quantity: number;
  unitPrice: number; // Precio unitario sin descuento
  discount: number; // Descuento aplicado a este item
  subtotal: number; // unitPrice * quantity
  total: number; // subtotal - discount
}

export interface Address {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
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
  customerInfo?: CustomerInfo; // Datos del cliente para crear/actualizar Lead
  items: CreateOrderItemDto[];
  shippingAddress?: Address;
  shippingMethod?: string;
  discountCode?: string; // Código de descuento opcional
}

export interface CreateOrderItemDto {
  productId: string;
  variantId?: string; // ID de la variante (tamaño)
  quantity: number;
}

export interface ApplyDiscountCodeDto {
  code: string;
}

