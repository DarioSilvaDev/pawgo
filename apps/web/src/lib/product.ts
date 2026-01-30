import { fetchAPI } from "./auth";

export interface Product {
  id: string;
  name: string;
  description: string;
  basePrice: number;
  launchPrice?: number | null; // Precio de lanzamiento (opcional)
  currency: string;
  images: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  variants?: ProductVariant[];
}

export interface ProductVariant {
  id: string;
  productId: string;
  name: string;
  size?: string;
  price?: number; // Precio especial (ej: lanzamiento). Si no existe, usa basePrice del producto
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
  launchPrice?: number; // Precio de lanzamiento (opcional)
  currency?: string;
  images?: string[];
  isActive?: boolean;
  variants?: CreateProductVariantDto[];
}

export interface CreateProductVariantDto {
  name: string;
  size?: string;
  price?: number; // Opcional: si no se especifica, usa basePrice del producto
  stock?: number;
  sku?: string;
  isActive?: boolean;
}

export interface UpdateProductDto {
  name?: string;
  description?: string;
  basePrice?: number;
  launchPrice?: number | null; // null para remover el precio de lanzamiento
  currency?: string;
  images?: string[];
  isActive?: boolean;
}

export interface UpdateProductVariantDto {
  name?: string;
  size?: string;
  price?: number;
  stock?: number;
  sku?: string;
  isActive?: boolean;
}

export async function getProducts(filters?: {
  isActive?: boolean;
  search?: string;
}): Promise<{ products: Product[] }> {
  const params = new URLSearchParams();
  if (filters?.isActive !== undefined) {
    params.append("isActive", filters.isActive.toString());
  }
  if (filters?.search) {
    params.append("search", filters.search);
  }

  const query = params.toString();
  const endpoint = `/products${query ? `?${query}` : ""}`;
  const response = await fetchAPI(endpoint);
  return response.json();
}

export async function getProduct(id: string): Promise<Product> {
  const response = await fetchAPI(`/products/${id}`);
  return response.json();
}

export async function createProduct(data: CreateProductDto): Promise<Product> {
  const response = await fetchAPI("/products", {
    method: "POST",
    body: JSON.stringify(data),
  });
  return response.json();
}

export async function updateProduct(
  id: string,
  data: UpdateProductDto
): Promise<Product> {
  const response = await fetchAPI(`/products/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
  return response.json();
}

export async function deleteProduct(id: string): Promise<void> {
  await fetchAPI(`/products/${id}`, {
    method: "DELETE",
  });
}

export async function createVariant(
  productId: string,
  data: CreateProductVariantDto
): Promise<ProductVariant> {
  const response = await fetchAPI(`/products/${productId}/variants`, {
    method: "POST",
    body: JSON.stringify(data),
  });
  return response.json();
}

export async function updateVariant(
  variantId: string,
  data: UpdateProductVariantDto
): Promise<ProductVariant> {
  const response = await fetchAPI(`/products/variants/${variantId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
  return response.json();
}

export async function deleteVariant(variantId: string): Promise<void> {
  await fetchAPI(`/products/variants/${variantId}`, {
    method: "DELETE",
  });
}
