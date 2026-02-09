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

/**
 * Upload product image
 * @param file - The image file to upload
 * @param productId - Optional product ID. If provided, the image will be automatically added to the product.
 */
export async function uploadProductImage(
  file: File,
  productId?: string
): Promise<{ key: string; filename: string, success: boolean }> {
  console.log("🌐 [uploadProductImage] Iniciando request de subida");
  console.log("  - File:", file.name, `(${(file.size / 1024 / 1024).toFixed(2)} MB)`);
  console.log("  - ProductId:", productId || "undefined");

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
  console.log("  - API URL:", API_URL);

  const token = localStorage.getItem("pawgo_access_token");

  if (!token) {
    console.error("❌ [uploadProductImage] No hay token de autenticación");
    throw new Error("No autenticado");
  }
  console.log("✅ [uploadProductImage] Token encontrado");

  const formData = new FormData();
  formData.append("file", file);

  console.log("📤 [uploadProductImage] Enviando request a:", `${API_URL}/api/upload/product-image`);
  const startTime = Date.now();

  try {
    const response = await fetch(`${API_URL}/api/upload/product-image?productId=${productId}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    const requestTime = Date.now() - startTime;
    console.log(`📥 [uploadProductImage] Respuesta recibida en ${requestTime}ms`);
    console.log("  - Status:", response.status, response.statusText);
    console.log("  - OK:", response.ok);

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        error: "Error desconocido",
      }));
      console.error("❌ [uploadProductImage] Error en la respuesta:", error);
      throw new Error(error.error || `HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log("✅ [uploadProductImage] Subida exitosa:");
    console.log("  - URL:", result.url);
    console.log("  - Filename:", result.filename);

    return result;
  } catch (error) {
    console.error("❌ [uploadProductImage] Error en fetch:", error);
    if (error instanceof Error) {
      console.error("  - Mensaje:", error.message);
      console.error("  - Stack:", error.stack);
    }
    throw error;
  }
}

export async function downloadImage(key: string): Promise<string> {
  console.log("🌐 [downloadImage] Iniciando request de descarga");
  console.log("  - Key:", key);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
  console.log("  - API URL:", API_URL);

  const token = localStorage.getItem("pawgo_access_token");

  if (!token) {
    console.error("❌ [downloadImage] No hay token de autenticación");
    throw new Error("No autenticado");
  }
  console.log("✅ [downloadImage] Token encontrado");

  console.log("📤 [downloadImage] Enviando request a:", `${API_URL}/api/upload/download?key=${key}`);
  const startTime = Date.now();

  try {
    const response = await fetch(`${API_URL}/api/upload/download?key=${key}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const requestTime = Date.now() - startTime;
    console.log(`📥 [downloadImage] Respuesta recibida en ${requestTime}ms`);
    console.log("  - Status:", response.status, response.statusText);
    console.log("  - OK:", response.ok);

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        error: "Error desconocido",
      }));
      console.error("❌ [downloadImage] Error en la respuesta:", error);
      throw new Error(error.error || `HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log("✅ [downloadImage] Descarga exitosa:");
    console.log("  - URL:", result.url);

    return result.url;
  } catch (error) {
    console.error("❌ [downloadImage] Error en fetch:", error);
    if (error instanceof Error) {
      console.error("  - Mensaje:", error.message);
      console.error("  - Stack:", error.stack);
    }
    throw error;
  }
} 