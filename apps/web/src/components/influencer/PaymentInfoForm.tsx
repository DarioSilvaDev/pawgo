"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getInfluencerProfile,
  updatePaymentInfo,
  type InfluencerProfile,
  type UpdatePaymentInfoDto,
} from "@/lib/influencer";
import { useToast } from "@/components/ui/useToast";

export function PaymentInfoForm() {
  const { showToast, ToastView } = useToast();
  const [profile, setProfile] = useState<InfluencerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state - mantener valores originales para preservar datos
  const [paymentMethod, setPaymentMethod] = useState<
    "transfer" | "mercadopago"
  >("transfer");
  const [accountNumber, setAccountNumber] = useState("");
  const [cvu, setCvu] = useState("");
  const [bankName, setBankName] = useState("");
  const [mercadopagoEmail, setMercadopagoEmail] = useState("");
  const [taxId, setTaxId] = useState("");
  const [taxIdError, setTaxIdError] = useState("");

  // Valores originales para preservar datos no modificados
  const [originalValues, setOriginalValues] = useState<{
    paymentMethod?: "transfer" | "mercadopago";
    accountNumber?: string;
    cvu?: string;
    bankName?: string;
    mercadopagoEmail?: string;
    taxId?: string;
  }>({});

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getInfluencerProfile();
      setProfile(data);

      // Guardar valores originales
      const original = {
        paymentMethod: data.paymentMethod as "transfer" | "mercadopago" | undefined,
        accountNumber: data.accountNumber,
        cvu: data.cvu,
        bankName: data.bankName,
        mercadopagoEmail: data.mercadopagoEmail,
        taxId: data.taxId,
      };
      setOriginalValues(original);

      // Set form values - usar valores existentes o valores por defecto
      setPaymentMethod(
        (data.paymentMethod as "transfer" | "mercadopago") || "transfer"
      );
      setAccountNumber(data.accountNumber || "");
      setCvu(data.cvu || "");
      setBankName(data.bankName || "");
      setMercadopagoEmail(data.mercadopagoEmail || "");
      setTaxId(data.taxId || "");
      setTaxIdError("");
    } catch (err) {
      showToast({
        type: "error",
        message: err instanceof Error ? err.message : "Error al cargar el perfil",
        durationMs: 6000,
      });
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  // Función para formatear CUIT/CUIL mientras se escribe
  const formatTaxId = (value: string): string => {
    // Remover todos los caracteres que no sean números
    const numbers = value.replace(/\D/g, "");
    
    // Limitar a 11 dígitos
    const limited = numbers.slice(0, 11);
    
    // Aplicar formato: xx-xxxxxxxx-x
    if (limited.length <= 2) {
      return limited;
    } else if (limited.length <= 10) {
      return `${limited.slice(0, 2)}-${limited.slice(2)}`;
    } else {
      return `${limited.slice(0, 2)}-${limited.slice(2, 10)}-${limited.slice(10)}`;
    }
  };

  // Función para validar formato de CUIT/CUIL
  const validateTaxId = (value: string): boolean => {
    if (!value) return true; // Opcional, si está vacío es válido
    // Formato: xx-xxxxxxxx-x (2 dígitos, guión, 8 dígitos, guión, 1 dígito)
    const taxIdRegex = /^\d{2}-\d{8}-\d{1}$/;
    return taxIdRegex.test(value);
  };

  const handleTaxIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatTaxId(e.target.value);
    setTaxId(formatted);
    
    // Validar formato
    if (formatted && !validateTaxId(formatted)) {
      setTaxIdError("El formato debe ser: XX-XXXXXXXX-X");
    } else {
      setTaxIdError("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setTaxIdError("");

    // Validar CUIT/CUIL antes de enviar
    if (taxId && !validateTaxId(taxId)) {
      setTaxIdError("El formato debe ser: XX-XXXXXXXX-X");
      showToast({ type: "error", message: "El formato debe ser: XX-XXXXXXXX-X" });
      setSaving(false);
      return;
    }

    try {
      const updateData: UpdatePaymentInfoDto = {};

      // Solo incluir campos que realmente cambiaron o tienen valores
      // Preservar valores originales si no se modificaron
      
      // Payment method - incluir solo si cambió
      if (paymentMethod !== originalValues.paymentMethod) {
        updateData.paymentMethod = paymentMethod;
      }

      // Tax ID - incluir solo si tiene valor o cambió
      if (taxId !== originalValues.taxId) {
        updateData.taxId = taxId || null;
      }

      // Si el método es transfer, incluir campos de transferencia
      if (paymentMethod === "transfer") {
        // Solo enviar si tienen valor o si cambiaron
        if (accountNumber !== originalValues.accountNumber) {
          updateData.accountNumber = accountNumber || null;
        }
        if (cvu !== originalValues.cvu) {
          updateData.cvu = cvu || null;
        }
        if (bankName !== originalValues.bankName) {
          updateData.bankName = bankName || null;
        }
        // Si cambió de mercadopago a transfer, limpiar email de MP
        if (originalValues.paymentMethod === "mercadopago") {
          updateData.mercadopagoEmail = null;
        }
      } 
      // Si el método es mercadopago, incluir email de MP
      else if (paymentMethod === "mercadopago") {
        if (mercadopagoEmail !== originalValues.mercadopagoEmail) {
          updateData.mercadopagoEmail = mercadopagoEmail || null;
        }
        // Si cambió de transfer a mercadopago, limpiar datos bancarios
        if (originalValues.paymentMethod === "transfer") {
          updateData.accountNumber = null;
          updateData.cvu = null;
          updateData.bankName = null;
        }
      }

      await updatePaymentInfo(updateData);
      showToast({
        type: "success",
        message: "Datos bancarios actualizados correctamente",
      });
      await loadProfile();
    } catch (err) {
      showToast({
        type: "error",
        message:
          err instanceof Error ? err.message : "Error al actualizar los datos",
        durationMs: 6000,
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <>
        {ToastView}
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-turquoise"></div>
        </div>
      </>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {ToastView}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          Datos Bancarios
        </h1>

        {/* Mostrar datos actuales si existen */}
        {profile && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h2 className="text-sm font-semibold text-blue-900 mb-3">
              Datos Actuales
            </h2>
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium text-gray-700">Método de Pago: </span>
                <span className="text-gray-600">
                  {profile.paymentMethod === "transfer"
                    ? "Transferencia Bancaria"
                    : profile.paymentMethod === "mercadopago"
                    ? "MercadoPago"
                    : "No configurado"}
                </span>
              </div>
              
              {/* Mostrar datos de transferencia si existen, independientemente del método configurado */}
              {(profile.accountNumber || profile.cvu || profile.bankName) && (
                <div className="mt-3 pt-3 border-t border-blue-200">
                  <h3 className="font-medium text-gray-700 mb-2">Datos de Transferencia Bancaria:</h3>
                  {profile.accountNumber && (
                    <div>
                      <span className="font-medium text-gray-700">Número de Cuenta: </span>
                      <span className="text-gray-600">{profile.accountNumber}</span>
                    </div>
                  )}
                  {profile.cvu && (
                    <div>
                      <span className="font-medium text-gray-700">CVU/CBU: </span>
                      <span className="text-gray-600">{profile.cvu}</span>
                    </div>
                  )}
                  {profile.bankName && (
                    <div>
                      <span className="font-medium text-gray-700">Banco: </span>
                      <span className="text-gray-600">{profile.bankName}</span>
                    </div>
                  )}
                </div>
              )}
              
              {/* Mostrar datos de MercadoPago si existen */}
              {profile.mercadopagoEmail && (
                <div className="mt-3 pt-3 border-t border-blue-200">
                  <h3 className="font-medium text-gray-700 mb-2">Datos de MercadoPago:</h3>
                  <div>
                    <span className="font-medium text-gray-700">Email: </span>
                    <span className="text-gray-600">{profile.mercadopagoEmail}</span>
                  </div>
                </div>
              )}
              
              {/* Mostrar CUIT/CUIL si existe */}
              {profile.taxId && (
                <div className="mt-3 pt-3 border-t border-blue-200">
                  <div>
                    <span className="font-medium text-gray-700">CUIT/CUIL: </span>
                    <span className="text-gray-600">{profile.taxId}</span>
                  </div>
                </div>
              )}
              
              {/* Mensaje si no hay datos */}
              {!profile.paymentMethod && 
               !profile.accountNumber && 
               !profile.cvu && 
               !profile.bankName && 
               !profile.mercadopagoEmail && 
               !profile.taxId && (
                <div className="text-gray-500 italic">
                  No hay datos bancarios configurados aún.
                </div>
              )}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Método de Pago */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Método de Pago
            </label>
            <div className="flex space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="paymentMethod"
                  value="transfer"
                  checked={paymentMethod === "transfer"}
                  onChange={(e) =>
                    setPaymentMethod(e.target.value as "transfer" | "mercadopago")
                  }
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">
                  Transferencia Bancaria
                </span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="paymentMethod"
                  value="mercadopago"
                  checked={paymentMethod === "mercadopago"}
                  onChange={(e) =>
                    setPaymentMethod(e.target.value as "transfer" | "mercadopago")
                  }
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">MercadoPago</span>
              </label>
            </div>
          </div>

          {/* Datos de Transferencia Bancaria */}
          {paymentMethod === "transfer" && (
            <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">
                Datos de Transferencia Bancaria
              </h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Número de Cuenta
                </label>
                <input
                  type="text"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder="Ej: 1234567890"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-turquoise focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  CVU/CBU
                </label>
                <input
                  type="text"
                  value={cvu}
                  onChange={(e) => setCvu(e.target.value)}
                  placeholder="Ej: 0000123456789012345678"
                  maxLength={22}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-turquoise focus:border-transparent"
                />
                <p className="mt-1 text-xs text-gray-500">
                  CVU/CBU de 22 dígitos para transferencias
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre del Banco
                </label>
                <input
                  type="text"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="Ej: Banco Nación"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-turquoise focus:border-transparent"
                />
              </div>
            </div>
          )}

          {/* Datos de MercadoPago */}
          {paymentMethod === "mercadopago" && (
            <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">
                Datos de MercadoPago
              </h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email de MercadoPago
                </label>
                <input
                  type="email"
                  value={mercadopagoEmail}
                  onChange={(e) => setMercadopagoEmail(e.target.value)}
                  placeholder="tu-email@mercadopago.com"
                  required={paymentMethod === "mercadopago"}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-turquoise focus:border-transparent"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Email asociado a tu cuenta de MercadoPago
                </p>
              </div>
            </div>
          )}

          {/* CUIT/CUIL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              CUIT/CUIL (Opcional)
            </label>
            <input
              type="text"
              value={taxId}
              onChange={handleTaxIdChange}
              placeholder="Ej: 27-12345678-9"
              maxLength={13} // 2-8-1 = 11 dígitos + 2 guiones = 13 caracteres
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-turquoise focus:border-transparent ${
                taxIdError
                  ? "border-red-300 focus:ring-red-500"
                  : "border-gray-300"
              }`}
            />
            {taxIdError ? (
              <p className="mt-1 text-xs text-red-600">{taxIdError}</p>
            ) : (
              <p className="mt-1 text-xs text-gray-500">
                CUIT/CUIL para facturación (formato: XX-XXXXXXXX-X)
              </p>
            )}
          </div>

          {/* Botones */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={() => {
                // Restaurar valores originales
                if (originalValues.paymentMethod) {
                  setPaymentMethod(originalValues.paymentMethod);
                }
                setAccountNumber(originalValues.accountNumber || "");
                setCvu(originalValues.cvu || "");
                setBankName(originalValues.bankName || "");
                setMercadopagoEmail(originalValues.mercadopagoEmail || "");
                setTaxId(originalValues.taxId || "");
                setTaxIdError("");
              }}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-turquoise disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-turquoise rounded-lg hover:bg-primary-turquoise/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-turquoise disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? "Guardando..." : "Guardar Cambios"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

