"use client";

import { useState, useEffect, useCallback } from "react";
import { CustomerInfo } from "@/lib/order";

interface CustomerInfoFormProps {
  onInfoChange: (info: CustomerInfo | null) => void;
  initialInfo?: CustomerInfo | null;
}

export function CustomerInfoForm({
  onInfoChange,
  initialInfo,
}: CustomerInfoFormProps) {
  const [formData, setFormData] = useState<CustomerInfo>({
    name: initialInfo?.name || "",
    lastName: initialInfo?.lastName || "",
    dni: initialInfo?.dni || "",
    phoneNumber: initialInfo?.phoneNumber || "",
    email: initialInfo?.email || "",
  });

  const [errors, setErrors] = useState<Partial<Record<keyof CustomerInfo, string>>>({});

  const validateForm = useCallback(() => {
    const newErrors: Partial<Record<keyof CustomerInfo, string>> = {};

    if (!formData.name.trim()) {
      newErrors.name = "El nombre es requerido";
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = "El apellido es requerido";
    }

    if (!formData.dni.trim()) {
      newErrors.dni = "El DNI es requerido";
    } else if (!/^\d{7,8}$/.test(formData.dni.trim())) {
      newErrors.dni = "El DNI debe tener 7 u 8 dígitos";
    }

    if (!formData.phoneNumber.trim()) {
      newErrors.phoneNumber = "El número de celular es requerido";
    } else if (!/^\+?\d{10,15}$/.test(formData.phoneNumber.trim().replace(/\s/g, ""))) {
      newErrors.phoneNumber = "Ingrese un número de celular válido";
    }

    if (!formData.email.trim()) {
      newErrors.email = "El email es requerido";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      newErrors.email = "Ingrese un email válido";
    }

    setErrors(newErrors);

    const isValid = Object.keys(newErrors).length === 0;
    if (isValid) {
      onInfoChange(formData);
    } else {
      onInfoChange(null);
    }
  }, [formData, onInfoChange]);

  useEffect(() => {
    validateForm();
  }, [validateForm]);

  const handleChange = (field: keyof CustomerInfo, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
      <h2 className="text-xl md:text-2xl font-semibold text-text-black mb-4">
        Datos del Cliente
      </h2>
      <p className="text-sm text-text-dark-gray mb-6">
        Por favor, completa tus datos para procesar tu pedido
      </p>

      <div className="space-y-4">
        {/* Nombre */}
        <div>
          <label
            htmlFor="name"
            className="block text-sm font-medium text-text-black mb-1"
          >
            Nombre <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="name"
            value={formData.name}
            onChange={(e) => handleChange("name", e.target.value)}
            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-turquoise ${errors.name ? "border-red-500" : "border-gray-300"
              }`}
            placeholder="Juan"
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-500">{errors.name}</p>
          )}
        </div>

        {/* Apellido */}
        <div>
          <label
            htmlFor="lastName"
            className="block text-sm font-medium text-text-black mb-1"
          >
            Apellido <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="lastName"
            value={formData.lastName}
            onChange={(e) => handleChange("lastName", e.target.value)}
            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-turquoise ${errors.lastName ? "border-red-500" : "border-gray-300"
              }`}
            placeholder="Pérez"
          />
          {errors.lastName && (
            <p className="mt-1 text-sm text-red-500">{errors.lastName}</p>
          )}
        </div>

        {/* DNI */}
        <div>
          <label
            htmlFor="dni"
            className="block text-sm font-medium text-text-black mb-1"
          >
            DNI <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="dni"
            value={formData.dni}
            onChange={(e) => {
              // Solo permitir números
              const value = e.target.value.replace(/\D/g, "");
              handleChange("dni", value);
            }}
            maxLength={8}
            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-turquoise ${errors.dni ? "border-red-500" : "border-gray-300"
              }`}
            placeholder="12345678"
          />
          {errors.dni && (
            <p className="mt-1 text-sm text-red-500">{errors.dni}</p>
          )}
        </div>

        {/* Teléfono */}
        <div>
          <label
            htmlFor="phoneNumber"
            className="block text-sm font-medium text-text-black mb-1"
          >
            Número de Celular <span className="text-red-500">*</span>
          </label>
          <input
            type="tel"
            id="phoneNumber"
            value={formData.phoneNumber}
            onChange={(e) => {
              // Permitir números, espacios, guiones y el signo +
              const value = e.target.value.replace(/[^\d\s+\-]/g, "");
              handleChange("phoneNumber", value);
            }}
            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-turquoise ${errors.phoneNumber ? "border-red-500" : "border-gray-300"
              }`}
            placeholder="+54 9 11 1234-5678"
          />
          {errors.phoneNumber && (
            <p className="mt-1 text-sm text-red-500">{errors.phoneNumber}</p>
          )}
        </div>

        {/* Email */}
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-text-black mb-1"
          >
            Email <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            id="email"
            value={formData.email}
            onChange={(e) => handleChange("email", e.target.value)}
            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-turquoise ${errors.email ? "border-red-500" : "border-gray-300"
              }`}
            placeholder="juan.perez@example.com"
          />
          {errors.email && (
            <p className="mt-1 text-sm text-red-500">{errors.email}</p>
          )}
        </div>
      </div>
    </div>
  );
}
