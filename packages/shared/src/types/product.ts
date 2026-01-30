// Producto base
export interface Product {
  id: string;
  name: string;
  description: string;
  basePrice: number;
  currency: string;
  images: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  variants?: ProductVariant[];
}

// Variante de producto (tamaño, color, etc.)
export interface ProductVariant {
  id: string;
  productId: string;
  name: string; // Ej: "Pequeño", "Mediano", "Grande"
  size?: string; // Tamaño específico (opcional, para compatibilidad con dogSize)
  price: number;
  stock?: number;
  sku?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateProductDto {
  name: string;
  description: string;
  basePrice: number;
  currency: string;
  images: string[];
  variants?: CreateProductVariantDto[];
}

export interface CreateProductVariantDto {
  name: string;
  size?: string;
  price: number;
  stock?: number;
  sku?: string;
}

export interface UpdateProductDto {
  name?: string;
  description?: string;
  basePrice?: number;
  currency?: string;
  images?: string[];
  isActive?: boolean;
}

