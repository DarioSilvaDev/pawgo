"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { getProducts, Product, ProductVariant } from "@/lib/product";
import { createOrder, createPayment, CreateOrderDto } from "@/lib/order";
import { CheckoutStepper } from "@/components/checkout/CheckoutStepper";
import { ProductSelection } from "@/components/checkout/ProductSelection";
import { DiscountCodeInput } from "@/components/checkout/DiscountCodeInput";
import { OrderSummary } from "@/components/checkout/OrderSummary";
import { ShippingAddressForm, ShippingAddress } from "@/components/checkout/ShippingAddressForm";
import { getEffectivePrice } from "@/lib/pricing";

const STEPS = ["Seleccionar Producto", "Aplicar Descuento", "Datos de Envío", "Confirmar Compra"];

// Estructura: Map<productId, Map<variantId, quantity>>
type SelectedProducts = Map<string, Map<string, number>>;

export default function CheckoutPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProducts, setSelectedProducts] = useState<SelectedProducts>(
    new Map()
  );
  const [discountAmount, setDiscountAmount] = useState(0);
  const [appliedCode, setAppliedCode] = useState<string | undefined>();
  const [shippingAddress, setShippingAddress] = useState<ShippingAddress | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset processing state when component mounts (e.g., user navigates back)
  useEffect(() => {
    // Check if there's a payment process in sessionStorage
    const paymentInProgress = sessionStorage.getItem("paymentInProgress");
    
    // If user navigated back and there's no active payment, reset processing state
    if (!paymentInProgress) {
      setIsProcessing(false);
    }
  }, []);

  // Fetch products
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await getProducts({ isActive: true });
        setProducts(response.products);
      } catch (error) {
        console.error("Error fetching products:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  // Calculate order totals
  const orderData = useMemo(() => {
    const items: Array<{
      product: Product;
      variant: ProductVariant;
      quantity: number;
    }> = [];

    let subtotal = 0;

    selectedProducts.forEach((variants, productId) => {
      const product = products.find((p) => p.id === productId);
      if (product) {
        variants.forEach((quantity, variantId) => {
          if (quantity > 0) {
            const variant = product.variants?.find(
              (v) => v.id === variantId
            );
            if (variant) {
              items.push({
                product,
                variant,
                quantity,
              });
              // Calcular precio efectivo según reglas de negocio
              const effectivePrice = getEffectivePrice(product, variant);
              subtotal += effectivePrice * quantity;
            }
          }
        });
      }
    });

    // Calcular shippingCost: gratis si zipCode es 2900, 0 para otros (próximamente)
    const shippingCost = shippingAddress?.zipCode === "2900" ? 0 : 0;
    const total = Math.max(0, subtotal - discountAmount + shippingCost);

    return {
      items,
      subtotal,
      discount: discountAmount,
      shippingCost,
      total,
    };
  }, [selectedProducts, products, discountAmount, shippingAddress]);

  const handleSelectProduct = (
    productId: string,
    variantId: string,
    quantity: number
  ) => {
    const newSelected = new Map(selectedProducts);
    
    // Obtener o crear el mapa de variantes para este producto
    const productVariants = newSelected.get(productId) || new Map<string, number>();
    
    if (quantity > 0) {
      // Agregar o actualizar la cantidad de la variante
      productVariants.set(variantId, quantity);
    } else {
      // Remover la variante si la cantidad es 0
      productVariants.delete(variantId);
    }
    
    // Si el producto tiene variantes seleccionadas, actualizarlo, sino eliminarlo
    if (productVariants.size > 0) {
      newSelected.set(productId, productVariants);
    } else {
      newSelected.delete(productId);
    }
    
    setSelectedProducts(newSelected);
  };

  const handleDiscountValidated = (amount: number, code?: string) => {
    setDiscountAmount(amount);
    setAppliedCode(code);
  };

  const handleDiscountRemoved = () => {
    setDiscountAmount(0);
    setAppliedCode(undefined);
  };

  const canProceedToStep2 = orderData.items.length > 0;
  const canProceedToStep3 = canProceedToStep2;
  const canProceedToStep4 = 
    shippingAddress !== null && 
    shippingAddress.zipCode === "2900" &&
    shippingAddress.street.trim() !== "" &&
    shippingAddress.city.trim() !== "" &&
    shippingAddress.state.trim() !== "" &&
    shippingAddress.country.trim() !== "";

  const handleNext = () => {
    if (currentStep === 1 && canProceedToStep2) {
      setCurrentStep(2);
    } else if (currentStep === 2 && canProceedToStep3) {
      setCurrentStep(3);
    } else if (currentStep === 3 && canProceedToStep4) {
      setCurrentStep(4);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleCompleteOrder = async () => {
    if (orderData.items.length === 0) {
      setError("Debes seleccionar al menos un producto");
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Prepare order data
      const orderItems = orderData.items.map((item) => ({
        productId: item.product.id,
        variantId: item.variant.id,
        quantity: item.quantity,
      }));

      const orderDataToSend: CreateOrderDto = {
        items: orderItems,
        discountCode: appliedCode,
        shippingMethod: "standard",
        shippingAddress: shippingAddress || undefined,
      };

      // 1. Create order
      const order = await createOrder(orderDataToSend);

      // 2. Create payment with MercadoPago
      const payment = await createPayment(order.id);

      // 3. Mark payment as in progress in sessionStorage
      sessionStorage.setItem("paymentInProgress", "true");
      sessionStorage.setItem("paymentOrderId", order.id);

      // 4. Redirect user to MercadoPago checkout
      window.location.href = payment.paymentLink;
      
      // Note: The user will be redirected back to /checkout/success, /checkout/failure, or /checkout/pending
      // after completing the payment on MercadoPago
      // sessionStorage will be cleared in those pages
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Error al procesar el pedido. Por favor, intenta nuevamente."
      );
      setIsProcessing(false);
      // Clear payment in progress flag on error
      sessionStorage.removeItem("paymentInProgress");
      sessionStorage.removeItem("paymentOrderId");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-turquoise mx-auto mb-4"></div>
          <p className="text-text-dark-gray">Cargando productos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-light-gray py-8 md:py-12">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-text-black mb-2">
            Completar Compra
          </h1>
          <p className="text-text-dark-gray">
            Selecciona tus productos y completa tu pedido
          </p>
        </div>

        {/* Stepper */}
        <CheckoutStepper currentStep={currentStep} steps={STEPS} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Step 1: Product Selection */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
                  <h2 className="text-xl md:text-2xl font-semibold text-text-black mb-4">
                    Selecciona tu producto
                  </h2>
                  <ProductSelection
                    products={products}
                    selectedProducts={selectedProducts}
                    onSelectProduct={handleSelectProduct}
                  />
                </div>
              </div>
            )}

            {/* Step 2: Discount Code */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <DiscountCodeInput
                  subtotal={orderData.subtotal}
                  onCodeValidated={handleDiscountValidated}
                  onCodeRemoved={handleDiscountRemoved}
                  appliedDiscount={discountAmount}
                  appliedCode={appliedCode}
                />
              </div>
            )}

            {/* Step 3: Shipping Address */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <ShippingAddressForm
                  onAddressChange={setShippingAddress}
                  initialAddress={shippingAddress}
                />
              </div>
            )}

            {/* Step 4: Order Confirmation */}
            {currentStep === 4 && (
              <div className="space-y-6">
                  <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
                    <h2 className="text-xl md:text-2xl font-semibold text-text-black mb-4">
                      Confirmar Pedido
                    </h2>
                    <div className="space-y-4">
                      <div>
                        <h3 className="font-semibold text-text-black mb-2">
                          Productos seleccionados:
                        </h3>
                        <div className="space-y-2">
                          {orderData.items.map((item, index) => (
                            <div
                              key={index}
                              className="flex justify-between text-sm border-b border-gray-100 pb-2"
                            >
                              <span className="text-text-dark-gray">
                                {item.product.name} - {item.variant.name} (x
                                {item.quantity})
                              </span>
                              <span className="font-medium">
                                $
                                {(
                                  Number(item.variant.price ?? item.product.basePrice) * item.quantity
                                ).toLocaleString("es-AR")}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {appliedCode && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                          <p className="text-sm text-green-800">
                            Código aplicado: <strong>{appliedCode}</strong>
                          </p>
                        </div>
                      )}

                      {error && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                          <p className="text-sm text-red-800">{error}</p>
                        </div>
                      )}

                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <p className="text-sm text-blue-800 mb-2">
                          <strong>Próximo paso:</strong> Al completar el pedido, serás redirigido a MercadoPago
                          para realizar el pago de forma segura.
                        </p>
                        <p className="text-xs text-blue-700">
                          Una vez completado el pago, serás redirigido de vuelta a nuestro sitio.
                        </p>
                      </div>
                    </div>
                  </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 mt-6 md:mt-8">
              {currentStep > 1 && (
                <button
                  onClick={handleBack}
                  className="btn-secondary flex-1 sm:flex-none sm:px-8 order-2 sm:order-1"
                >
                  Atrás
                </button>
              )}
              {currentStep < STEPS.length ? (
                <button
                  onClick={handleNext}
                  disabled={
                    (currentStep === 1 && !canProceedToStep2) ||
                    (currentStep === 2 && !canProceedToStep3) ||
                    (currentStep === 3 && !canProceedToStep4)
                  }
                  className="btn-primary flex-1 sm:flex-none sm:px-8 disabled:opacity-50 disabled:cursor-not-allowed order-1 sm:order-2"
                >
                  Continuar
                </button>
              ) : (
                <button
                  onClick={handleCompleteOrder}
                  disabled={
                    orderData.items.length === 0 ||
                    isProcessing
                  }
                  className="btn-primary flex-1 sm:flex-none sm:px-8 disabled:opacity-50 disabled:cursor-not-allowed order-1"
                >
                  {isProcessing ? (
                    <span className="flex items-center gap-2">
                      <svg
                        className="animate-spin h-5 w-5"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Procesando...
                    </span>
                  ) : (
                    "Completar Pedido"
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Sidebar - Order Summary */}
          <div className="lg:col-span-1">
            <OrderSummary
              items={orderData.items}
              subtotal={orderData.subtotal}
              discount={orderData.discount}
              shippingCost={orderData.shippingCost}
              total={orderData.total}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
