"use client";

import { useState } from "react";

export interface ShippingAddress {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

interface ShippingAddressFormProps {
  onAddressChange: (address: ShippingAddress | null) => void;
  initialAddress?: ShippingAddress | null;
}

export function ShippingAddressForm({
  onAddressChange,
  initialAddress,
}: ShippingAddressFormProps) {
  const [formData, setFormData] = useState<ShippingAddress>({
    street: initialAddress?.street || "",
    city: initialAddress?.city || "",
    state: initialAddress?.state || "",
    zipCode: initialAddress?.zipCode || "",
    country: initialAddress?.country || "Argentina",
  });

  const [errors, setErrors] = useState<
    Partial<Record<keyof ShippingAddress, string>>
  >({});

  const handleChange = (field: keyof ShippingAddress, value: string) => {
    const newData = { ...formData, [field]: value };
    setFormData(newData);

    // Clear error for this field
    if (errors[field]) {
      setErrors({ ...errors, [field]: undefined });
    }

    // Validate zipCode is numeric
    if (field === "zipCode") {
      const numericValue = value.replace(/\D/g, ""); // Remove non-numeric characters
      if (numericValue !== value && value !== "") {
        setErrors({
          ...errors,
          zipCode: "El código postal debe contener solo números",
        });
        return;
      }
      newData.zipCode = numericValue;
    }

    // Validate all required fields
    const isValid = validateForm(newData);
    if (isValid) {
      onAddressChange(newData);
    } else {
      onAddressChange(null);
    }
  };

  const validateForm = (data: ShippingAddress): boolean => {
    const newErrors: Partial<Record<keyof ShippingAddress, string>> = {};

    if (!data.street.trim()) {
      newErrors.street = "La calle es requerida";
    }

    if (!data.city.trim()) {
      newErrors.city = "La ciudad es requerida";
    }

    if (!data.state.trim()) {
      newErrors.state = "La provincia es requerida";
    }

    if (!data.zipCode.trim()) {
      newErrors.zipCode = "El código postal es requerido";
    } else if (!/^\d+$/.test(data.zipCode)) {
      newErrors.zipCode = "El código postal debe contener solo números";
    }

    if (!data.country.trim()) {
      newErrors.country = "El país es requerido";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isFreeShipping = formData.zipCode === "2900";
  const hasOtherZipCode =
    formData.zipCode !== "" && formData.zipCode !== "2900";

  return (
    <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
      <h2 className="text-xl md:text-2xl font-semibold text-text-black mb-6">
        Datos de Envío
      </h2>

      <div className="space-y-4">
        {/* Calle */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Calle y Número *
          </label>
          <input
            type="text"
            required
            value={formData.street}
            onChange={(e) => handleChange("street", e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-turquoise focus:border-transparent ${
              errors.street ? "border-red-500" : "border-gray-300"
            }`}
            placeholder="Ej: Av. San Martín 1234"
          />
          {errors.street && (
            <p className="mt-1 text-sm text-red-600">{errors.street}</p>
          )}
        </div>

        {/* Ciudad y Provincia en fila */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ciudad *
            </label>
            <input
              type="text"
              required
              value={formData.city}
              onChange={(e) => handleChange("city", e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-turquoise focus:border-transparent ${
                errors.city ? "border-red-500" : "border-gray-300"
              }`}
              placeholder="Ej: San Nicolas de los Arroyos"
            />
            {errors.city && (
              <p className="mt-1 text-sm text-red-600">{errors.city}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Provincia *
            </label>
            <input
              type="text"
              required
              value={formData.state}
              onChange={(e) => handleChange("state", e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-turquoise focus:border-transparent ${
                errors.state ? "border-red-500" : "border-gray-300"
              }`}
              placeholder="Ej: Buenos Aires"
            />
            {errors.state && (
              <p className="mt-1 text-sm text-red-600">{errors.state}</p>
            )}
          </div>
        </div>

        {/* Código Postal y País en fila */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Código Postal *
            </label>
            <input
              type="text"
              required
              value={formData.zipCode}
              onChange={(e) => handleChange("zipCode", e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-turquoise focus:border-transparent ${
                errors.zipCode ? "border-red-500" : "border-gray-300"
              }`}
              placeholder="Ej: 2900"
              maxLength={10}
            />
            {errors.zipCode && (
              <p className="mt-1 text-sm text-red-600">{errors.zipCode}</p>
            )}
            {isFreeShipping && (
              <p className="mt-1 text-sm text-green-600 font-medium">
                ✓ Envío gratis para este código postal
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              País *
            </label>
            <input
              type="text"
              required
              value={formData.country}
              onChange={(e) => handleChange("country", e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-turquoise focus:border-transparent ${
                errors.country ? "border-red-500" : "border-gray-300"
              }`}
              placeholder="Argentina"
            />
            {errors.country && (
              <p className="mt-1 text-sm text-red-600">{errors.country}</p>
            )}
          </div>
        </div>

        {/* Mensaje de próximamente para otros códigos postales */}
        {hasOtherZipCode && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mt-4">
            <div className="flex items-start gap-3">
              <svg
                className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <div>
                <p className="text-sm font-medium text-amber-800">
                  Próximamente
                </p>
                <p className="text-sm text-amber-700 mt-1">
                  El cálculo de envío para este código postal estará disponible
                  próximamente. Por ahora solo realizamos envíos a código postal
                  2900.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
