"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { getProducts, Product, ProductVariant } from "@/lib/product";
import { createOrder, createPayment, CreateOrderDto } from "@/lib/order";
import { CheckoutStepper } from "@/components/checkout/CheckoutStepper";
import { ProductSelection } from "@/components/checkout/ProductSelection";
import { DiscountCodeInput } from "@/components/checkout/DiscountCodeInput";
import { OrderSummary } from "@/components/checkout/OrderSummary";
import { InstallmentsMessage } from "@/components/checkout/InstallmentsMessage";
import { ShippingAddressForm, ShippingAddress } from "@/components/checkout/ShippingAddressForm";
import { CustomerInfoForm } from "@/components/checkout/CustomerInfoForm";
import { CustomerInfo } from "@/lib/order";
import { getEffectivePrice, PaymentType } from "@/lib/pricing";
import { BuyIntentModal } from "@/components/modals/BuyIntentModal";
import { getPickupPoints, PickupPoint } from "@/lib/partner";
import { MercadoPagoTrustBadge } from "@/components/checkout/MercadoPagoTrustBadge";

const STEPS = ["Seleccionar Producto", "Aplicar Descuento", "Datos del Cliente", "Datos de Envío", "Confirmar Compra"];
const PARTNER_STEPS = ["Seleccionar Producto", "Datos del Cliente", "Entrega o Retiro", "Confirmar Compra"];
const PAYMENT_TYPE_STORAGE_KEY = "checkout_payment_type";

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
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [shippingAddress, setShippingAddress] = useState<ShippingAddress | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showStockModal, setShowStockModal] = useState(false);
  const [selectedProductForModal, setSelectedProductForModal] = useState<Product | undefined>();
  const [partnerReferralSlug, setPartnerReferralSlug] = useState<string | null>(null);
  const [paymentType, setPaymentType] = useState<PaymentType>("card");
  const [fulfillmentType, setFulfillmentType] = useState<"home_delivery" | "pickup_point">("home_delivery");
  const [pickupPoints, setPickupPoints] = useState<PickupPoint[]>([]);
  const [selectedPickupPointId, setSelectedPickupPointId] = useState<string>("");

  const isPartnerFlow = !!partnerReferralSlug;
  const steps = isPartnerFlow ? PARTNER_STEPS : STEPS;
  const lastStep = steps.length;

  useEffect(() => {
    if (currentStep > lastStep) {
      setCurrentStep(lastStep);
    }
  }, [currentStep, lastStep]);

  const handleBackInStockRequest = (product: Product) => {
    setSelectedProductForModal(product);
    setShowStockModal(true);
  };

  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get("partner_ref")?.trim().toLowerCase();

    if (fromUrl) {
      setPartnerReferralSlug(fromUrl);
      setAppliedCode(undefined);
      setDiscountAmount(0);
    } else {
      setPartnerReferralSlug(null);
      setFulfillmentType("home_delivery");
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const stored = window.localStorage.getItem(PAYMENT_TYPE_STORAGE_KEY);
    if (stored === "card" || stored === "cash") {
      setPaymentType(stored);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(PAYMENT_TYPE_STORAGE_KEY, paymentType);
  }, [paymentType]);

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

  useEffect(() => {
    if (!isPartnerFlow) return;

    const fetchPoints = async () => {
      try {
        const points = await getPickupPoints();
        setPickupPoints(points);
        if (points.length > 0 && !selectedPickupPointId) {
          setSelectedPickupPointId(points[0].id);
        }
      } catch (err) {
        console.error("Error fetching pickup points:", err);
      }
    };

    fetchPoints();
  }, [isPartnerFlow, selectedPickupPointId]);

  const selectedPickupPoint = useMemo(
    () => pickupPoints.find((point) => point.id === selectedPickupPointId),
    [pickupPoints, selectedPickupPointId]
  );

  const formatPickupAddress = (point?: PickupPoint) => {
    if (!point) return "";

    const rawAddress = point.address;
    const getField = (keys: string[]) => {
      if (!rawAddress || typeof rawAddress !== "object") return "";
      for (const key of keys) {
        const value = rawAddress[key];
        if (typeof value === "string" && value.trim() !== "") {
          return value.trim();
        }
      }
      return "";
    };

    const line1 = getField(["line1", "street", "addressLine", "direccion"]);
    const line2 = getField(["line2", "reference", "details", "referencia"]);
    const cityState = `${point.city || ""}${point.state ? `${point.city ? ", " : ""}${point.state}` : ""}`;

    return [line1, line2, cityState].filter(Boolean).join(" - ");
  };

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
              const effectivePrice = getEffectivePrice(product, variant, paymentType);
              subtotal += effectivePrice * quantity;
            }
          }
        });
      }
    });

    // Calcular shippingCost: gratis
    const shippingCost = 0;
    const total = Math.max(0, subtotal - discountAmount + shippingCost);

    return {
      items,
      subtotal,
      discount: discountAmount,
      shippingCost,
      total,
    };
  }, [selectedProducts, products, discountAmount, paymentType]);

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
  const canProceedToStep3 = customerInfo !== null;
  const canProceedToStep4 =
    fulfillmentType === "pickup_point"
      ? selectedPickupPointId.trim() !== ""
      : shippingAddress !== null &&
      shippingAddress.zipCode &&
      shippingAddress.street.trim() !== "" &&
      shippingAddress.city.trim() !== "" &&
      shippingAddress.state.trim() !== "" &&
      shippingAddress.country.trim() !== "";

  const handleNext = () => {
    if (!isPartnerFlow) {
      if (currentStep === 1 && canProceedToStep2) {
        setCurrentStep(2);
      } else if (currentStep === 2 && canProceedToStep2) {
        setCurrentStep(3);
      } else if (currentStep === 3 && canProceedToStep3) {
        setCurrentStep(4);
      } else if (currentStep === 4 && canProceedToStep4) {
        setCurrentStep(5);
      }
      return;
    }

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

      if (!customerInfo) {
        setError("Por favor, completa tus datos personales");
        setIsProcessing(false);
        return;
      }

      const orderDataToSend: CreateOrderDto = {
        items: orderItems,
        customerInfo: customerInfo,
        discountCode: isPartnerFlow ? undefined : appliedCode,
        paymentType,
        shippingMethod: fulfillmentType === "pickup_point" ? "pickup_point" : "standard",
        fulfillmentType,
        pickupPointId: fulfillmentType === "pickup_point" ? selectedPickupPointId : undefined,
        partnerReferralSlug: partnerReferralSlug || undefined,
        shippingAddress: fulfillmentType === "home_delivery" ? shippingAddress || undefined : undefined,
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
        <CheckoutStepper currentStep={currentStep} steps={steps} />

        {isPartnerFlow && (
          <div className="mb-6 bg-teal-50 border border-teal-200 rounded-lg p-4">
            <p className="text-sm text-teal-800">
              Estás comprando desde un <strong>QR de Punto PawGo</strong>.
            </p>
          </div>
        )}

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
                    paymentType={paymentType}
                    onPaymentTypeChange={setPaymentType}
                    selectedProducts={selectedProducts}
                    onSelectProduct={handleSelectProduct}
                    onBackInStockRequest={handleBackInStockRequest}
                  />
                </div>
              </div>
            )}

            {showStockModal && (
              <BuyIntentModal
                onClose={() => setShowStockModal(false)}
                mode="WAITLIST"
                product={selectedProductForModal}
              />
            )}

            {/* Step 2: Discount Code */}
            {!isPartnerFlow && currentStep === 2 && (
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

            {/* Step 3: Customer Info */}
            {((!isPartnerFlow && currentStep === 3) || (isPartnerFlow && currentStep === 2)) && (
              <div className="space-y-6">
                <CustomerInfoForm
                  onInfoChange={setCustomerInfo}
                  initialInfo={customerInfo}
                />
              </div>
            )}

            {/* Step 4: Shipping Address */}
            {((!isPartnerFlow && currentStep === 4) || (isPartnerFlow && currentStep === 3)) && (
              <div className="space-y-6">
                {isPartnerFlow ? (
                  <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
                    <h2 className="text-xl md:text-2xl font-semibold text-text-black mb-4">
                      Método de entrega
                    </h2>
                    <div className="space-y-3">
                      <label className="flex items-start gap-3 border rounded-lg p-3 cursor-pointer">
                        <input
                          type="radio"
                          checked={fulfillmentType === "home_delivery"}
                          onChange={() => setFulfillmentType("home_delivery")}
                          className="mt-1"
                        />
                        <div>
                          <p className="font-semibold text-text-black">Envío a domicilio</p>
                          <p className="text-sm text-text-dark-gray">Recibís tu pedido en tu dirección.</p>
                        </div>
                      </label>

                      <label className="flex items-start gap-3 border rounded-lg p-3 cursor-pointer">
                        <input
                          type="radio"
                          checked={fulfillmentType === "pickup_point"}
                          onChange={() => setFulfillmentType("pickup_point")}
                          className="mt-1"
                        />
                        <div>
                          <p className="font-semibold text-text-black">Retiro en Punto PawGo</p>
                          <p className="text-sm text-text-dark-gray">
                            Te avisamos por email cuando el local tenga stock para retirar.
                          </p>
                        </div>
                      </label>
                    </div>

                    {fulfillmentType === "pickup_point" && (
                      <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Selecciona un Punto PawGo
                        </label>
                        <select
                          value={selectedPickupPointId}
                          onChange={(e) => setSelectedPickupPointId(e.target.value)}
                          className="input-field"
                        >
                          {pickupPoints.length === 0 && (
                            <option value="">No hay puntos disponibles</option>
                          )}
                          {pickupPoints.map((point) => (
                            <option key={point.id} value={point.id}>
                              {point.partner.name} - {formatPickupAddress(point) || point.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                ) : null}

                {(!isPartnerFlow || fulfillmentType === "home_delivery") && (
                  <ShippingAddressForm
                    onAddressChange={setShippingAddress}
                    initialAddress={shippingAddress}
                  />
                )}
              </div>
            )}

            {/* Step 5: Order Confirmation */}
            {((!isPartnerFlow && currentStep === 5) || (isPartnerFlow && currentStep === 4)) && (
              <div className="space-y-6">
                <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
                  <h2 className="text-xl md:text-2xl font-semibold text-text-black mb-4">
                    Confirmar Pedido
                  </h2>
                  <div className="space-y-4">
                    {/* Customer Info Summary */}
                    {customerInfo && (
                      <div>
                        <h3 className="font-semibold text-text-black mb-2">
                          Datos del Cliente:
                        </h3>
                        <div className="bg-gray-50 rounded-lg p-4 space-y-1 text-sm">
                          <p className="text-text-dark-gray">
                            <span className="font-medium">Nombre:</span> {customerInfo.name} {customerInfo.lastName}
                          </p>
                          <p className="text-text-dark-gray">
                            <span className="font-medium">DNI:</span> {customerInfo.dni}
                          </p>
                          <p className="text-text-dark-gray">
                            <span className="font-medium">Teléfono:</span> {customerInfo.phoneNumber}
                          </p>
                          <p className="text-text-dark-gray">
                            <span className="font-medium">Email:</span> {customerInfo.email}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Shipping Address Summary */}
                    {fulfillmentType === "home_delivery" && shippingAddress && (
                      <div>
                        <h3 className="font-semibold text-text-black mb-2">
                          Datos de Envío:
                        </h3>
                        <div className="bg-gray-50 rounded-lg p-4 space-y-1 text-sm">
                          <p className="text-text-dark-gray">
                            <span className="font-medium">Dirección:</span> {shippingAddress.street}
                            {shippingAddress.floor && `, Piso ${shippingAddress.floor}`}
                            {shippingAddress.apartment && ` Dpto. ${shippingAddress.apartment}`}
                          </p>
                          <p className="text-text-dark-gray">
                            <span className="font-medium">Ciudad:</span> {shippingAddress.city}
                          </p>
                          <p className="text-text-dark-gray">
                            <span className="font-medium">Provincia:</span> {shippingAddress.state}
                          </p>
                          <p className="text-text-dark-gray">
                            <span className="font-medium">Código Postal:</span> {shippingAddress.zipCode}
                          </p>
                          <p className="text-text-dark-gray">
                            <span className="font-medium">País:</span> {shippingAddress.country}
                          </p>
                          {shippingAddress.addressNotes && (
                            <p className="text-text-dark-gray pt-1 border-t border-gray-200 mt-1">
                              <span className="font-medium">Observaciones:</span> {shippingAddress.addressNotes}
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {fulfillmentType === "pickup_point" && (
                      <div>
                        <h3 className="font-semibold text-text-black mb-2">
                          Retiro en Punto PawGo:
                        </h3>
                        <div className="bg-gray-50 rounded-lg p-4 space-y-1 text-sm">
                          {!selectedPickupPoint ? (
                            <p className="text-text-dark-gray">Sin punto seleccionado</p>
                          ) : (
                            <>
                              <p className="text-text-dark-gray"><span className="font-medium">Local:</span> {selectedPickupPoint.partner.name}</p>
                              <p className="text-text-dark-gray"><span className="font-medium">Dirección:</span> {formatPickupAddress(selectedPickupPoint) || selectedPickupPoint.name}</p>
                            </>
                          )}
                        </div>
                      </div>
                    )}

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
                              {item.product.name} - Talle {item.variant.size} (x
                              {item.quantity})
                            </span>
                            <span className="font-medium">
                              $
                              {(
                                getEffectivePrice(item.product, item.variant, paymentType) * item.quantity
                              ).toLocaleString("es-AR")}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-text-dark-gray">
                        <span className="font-medium text-text-black">Método de pago seleccionado:</span>{" "}
                        {paymentType === "card" ? "Tarjeta (6 cuotas)" : "Contado / transferencia"}
                      </p>
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

                    <MercadoPagoTrustBadge />
                    <p className="text-xs text-sky-700 -mt-2">
                      Al completar el pedido, te redirigimos a Mercado Pago y luego volvés a PawGo.
                    </p>

                    {paymentType === "card" ? (
                      <InstallmentsMessage totalAmount={orderData.total} className="mt-2" />
                    ) : (
                      <div className="mt-2 rounded-lg border border-teal-200 bg-teal-50 px-3 py-2">
                        <p className="text-sm text-teal-700">
                          Estás pagando precio contado / transferencia.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            {/* Navigation Buttons - Hidden on Mobile sticky footer if in Step 1 */}
            <div className={`flex flex-col sm:flex-row gap-4 mt-6 md:mt-8 ${currentStep === 1 ? 'hidden sm:flex' : 'flex'}`}>
              {currentStep > 1 && (
                <button
                  onClick={handleBack}
                  className="btn-secondary flex-1 sm:flex-none sm:px-8 order-2 sm:order-1"
                >
                  Atrás
                </button>
              )}
              {currentStep < lastStep ? (
                <button
                  onClick={handleNext}
                  disabled={
                    (!isPartnerFlow &&
                      ((currentStep === 1 && !canProceedToStep2) ||
                        (currentStep === 2 && !canProceedToStep2) ||
                        (currentStep === 3 && !canProceedToStep3) ||
                        (currentStep === 4 && !canProceedToStep4))) ||
                    (isPartnerFlow &&
                      ((currentStep === 1 && !canProceedToStep2) ||
                        (currentStep === 2 && !canProceedToStep3) ||
                        (currentStep === 3 && !canProceedToStep4)))
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
              paymentType={paymentType}
            />
          </div>
        </div>
      </div>

      {/* Sticky Mobile Footer - Only for Step 1 for now to match ML experience */}
      {currentStep === 1 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] sm:hidden z-50 animate-in slide-in-from-bottom">
          <div className="flex items-center justify-between gap-4 max-w-lg mx-auto">
            <div className="flex flex-col">
              <span className="text-xs text-text-dark-gray">Total del producto</span>
              <span className="text-lg font-bold text-text-black">
                {new Intl.NumberFormat("es-AR", {
                  style: "currency",
                  currency: "ARS",
                  minimumFractionDigits: 0,
                }).format(orderData.total)}
              </span>
              <span className="text-[11px] font-medium text-text-dark-gray mt-0.5">
                {paymentType === "card" ? "Tarjeta (6 cuotas)" : "Contado / transferencia"}
              </span>
              {paymentType === "card" ? (
                <InstallmentsMessage
                  totalAmount={orderData.total}
                  variant="inline"
                  className="mt-1"
                />
              ) : ""}
              <MercadoPagoTrustBadge variant="inline" className="mt-1" />
            </div>
            <button
              onClick={handleNext}
              disabled={!canProceedToStep2}
              className="btn-primary flex-1 py-3 px-6 h-auto text-base font-bold shadow-lg shadow-primary-turquoise/20 disabled:grayscale disabled:opacity-50"
            >
              {canProceedToStep2 ? "Continuar" : "Elegí un producto"}
            </button>
          </div>
        </div>
      )}

      {/* Add padding to bottom when sticky is present */}
      {currentStep === 1 && <div className="h-28 sm:hidden" />}
    </div>
  );
}
