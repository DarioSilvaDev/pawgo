"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { getProducts } from "@/lib/product";
import { partnerAdminAPI, Partner, PartnerWholesaleSale, PickupRequest } from "@/lib/partner";
import { API_URL } from "@/lib/config";

interface WholesaleSaleItemForm {
  productVariantId: string;
  quantity: number;
  unitWholesalePrice: number;
  unitCost: number;
}

const DEFAULT_ITEM: WholesaleSaleItemForm = {
  productVariantId: "",
  quantity: 1,
  unitWholesalePrice: 50000,
  unitCost: 30000,
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatAddress(address?: Record<string, unknown> | null): string {
  if (!address || typeof address !== "object") return "";

  const getField = (keys: string[]): string => {
    for (const key of keys) {
      const value = address[key];
      if (typeof value === "string" && value.trim() !== "") {
        return value.trim();
      }
    }
    return "";
  };

  const line1 = getField(["line1", "street", "addressLine", "direccion"]);
  const line2 = getField(["line2", "apartment", "details", "direccion2"]);
  const reference = getField(["reference", "notes", "referencia"]);

  return [line1, line2, reference].filter(Boolean).join(" - ");
}

export default function PartnersDashboardPage() {
  const { user, loading, isAdmin } = useAuth();
  const router = useRouter();

  const [partners, setPartners] = useState<Partner[]>([]);
  const [sales, setSales] = useState<PartnerWholesaleSale[]>([]);
  const [pickupRequests, setPickupRequests] = useState<PickupRequest[]>([]);
  const [products, setProducts] = useState<Awaited<ReturnType<typeof getProducts>>["products"]>([]);

  const [selectedPartnerId, setSelectedPartnerId] = useState<string>("");
  const [loadingData, setLoadingData] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  const [partnerForm, setPartnerForm] = useState({
    name: "",
    slug: "",
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    addressLine: "",
    addressReference: "",
    city: "",
    state: "",
  });

  const [referralForm, setReferralForm] = useState({
    sourceType: "local_qr" as "local_qr" | "local_code",
    slug: "",
    code: "",
    partnerPointId: "",
  });

  const [saleForm, setSaleForm] = useState({
    invoiceNumber: "",
    notes: "",
    soldAt: "",
    items: [DEFAULT_ITEM] as WholesaleSaleItemForm[],
  });

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
      return;
    }

    if (!loading && !isAdmin) {
      router.push("/dashboard");
    }
  }, [loading, user, isAdmin, router]);

  const loadData = useCallback(async () => {
    try {
      setLoadingData(true);
      setError(null);

      const [partnersData, salesData, pickupData, productsData] = await Promise.all([
        partnerAdminAPI.getAll(),
        partnerAdminAPI.getWholesaleSales(),
        partnerAdminAPI.getPickupRequests("awaiting_stock"),
        getProducts({ isActive: true }),
      ]);

      setPartners(partnersData);
      setSales(salesData);
      setPickupRequests(pickupData);
      setProducts(productsData.products || []);

      if (!selectedPartnerId && partnersData.length > 0) {
        setSelectedPartnerId(partnersData[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar la información");
    } finally {
      setLoadingData(false);
    }
  }, [selectedPartnerId]);

  useEffect(() => {
    if (!loading && user && isAdmin) {
      loadData();
    }
  }, [loading, user, isAdmin, loadData]);

  const selectedPartner = useMemo(
    () => partners.find((partner) => partner.id === selectedPartnerId) || null,
    [partners, selectedPartnerId]
  );

  const selectedPartnerPoint = useMemo(
    () => (selectedPartner?.points || [])[0] || null,
    [selectedPartner]
  );

  const variants = useMemo(
    () =>
      products.flatMap((product) =>
        (product.variants || []).map((variant) => ({
          id: variant.id,
          label: `${product.name} - ${variant.name}${variant.size ? ` (${variant.size})` : ""}`,
        }))
      ),
    [products]
  );

  const getReferralUrl = useCallback((slug: string) => {
    if (typeof window !== "undefined") {
      return `${window.location.origin}/r/${slug}`;
    }
    return `https://www.pawgo-pet.com/r/${slug}`;
  }, []);

  const copyReferralUrl = useCallback(
    async (slug: string) => {
      const url = getReferralUrl(slug);
      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(url);
        } else {
          const temp = document.createElement("textarea");
          temp.value = url;
          temp.style.position = "fixed";
          temp.style.opacity = "0";
          document.body.appendChild(temp);
          temp.select();
          document.execCommand("copy");
          document.body.removeChild(temp);
        }
        setCopiedSlug(slug);
        setTimeout(() => setCopiedSlug((prev) => (prev === slug ? null : prev)), 2000);
      } catch {
        setError("No se pudo copiar el link. Puedes copiarlo manualmente.");
      }
    },
    [getReferralUrl]
  );

  const downloadReferralQr = useCallback(async (slug: string, format: "png" | "svg") => {
    try {
      const response = await fetch(
        `${API_URL}/partners/referrals/${encodeURIComponent(slug)}/qr?format=${format}`
      );
      if (!response.ok) {
        const payload = await response.json().catch(() => ({ error: "Error al generar QR" }));
        throw new Error(payload.error || `HTTP error! status: ${response.status}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `pawgo-ref-${slug}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo descargar el QR");
    }
  }, []);

  if (loading || loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-turquoise" />
      </div>
    );
  }

  if (!user || !isAdmin) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Partners y Canal Físico</h1>
          <p className="text-sm text-gray-600 mt-1">
            Crea partners con su dirección (Punto PawGo), genera QR/códigos y registra ventas mayoristas por talle.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Nuevo Partner + Punto PawGo</h2>
            <input
              value={partnerForm.name}
              onChange={(e) => setPartnerForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Nombre del local"
              className="input-field"
            />
            <input
              value={partnerForm.slug}
              onChange={(e) => setPartnerForm((prev) => ({ ...prev, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") }))}
              placeholder="slug-partner"
              className="input-field"
            />
            <input
              value={partnerForm.contactName}
              onChange={(e) => setPartnerForm((prev) => ({ ...prev, contactName: e.target.value }))}
              placeholder="Contacto"
              className="input-field"
            />
            <input
              value={partnerForm.contactEmail}
              onChange={(e) => setPartnerForm((prev) => ({ ...prev, contactEmail: e.target.value }))}
              placeholder="Email"
              className="input-field"
            />
            <input
              value={partnerForm.contactPhone}
              onChange={(e) => setPartnerForm((prev) => ({ ...prev, contactPhone: e.target.value }))}
              placeholder="Teléfono"
              className="input-field"
            />
            <input
              value={partnerForm.addressLine}
              onChange={(e) => setPartnerForm((prev) => ({ ...prev, addressLine: e.target.value }))}
              placeholder="Dirección del local (calle y número)"
              className="input-field"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                value={partnerForm.city}
                onChange={(e) => setPartnerForm((prev) => ({ ...prev, city: e.target.value }))}
                placeholder="Ciudad"
                className="input-field"
              />
              <input
                value={partnerForm.state}
                onChange={(e) => setPartnerForm((prev) => ({ ...prev, state: e.target.value }))}
                placeholder="Provincia"
                className="input-field"
              />
            </div>
            <input
              value={partnerForm.addressReference}
              onChange={(e) => setPartnerForm((prev) => ({ ...prev, addressReference: e.target.value }))}
              placeholder="Referencia de llegada (opcional)"
              className="input-field"
            />

            <button
              disabled={
                submitting ||
                !partnerForm.name ||
                !partnerForm.slug ||
                !partnerForm.addressLine ||
                !partnerForm.city ||
                !partnerForm.state
              }
              className="btn-primary w-full disabled:opacity-50"
              onClick={async () => {
                try {
                  setSubmitting(true);
                  const createdPartner = await partnerAdminAPI.create({
                    name: partnerForm.name,
                    slug: partnerForm.slug,
                    contactName: partnerForm.contactName || undefined,
                    contactEmail: partnerForm.contactEmail || undefined,
                    contactPhone: partnerForm.contactPhone || undefined,
                  });

                  await partnerAdminAPI.createPoint(createdPartner.id, {
                    name: createdPartner.name,
                    city: partnerForm.city,
                    state: partnerForm.state,
                    address: {
                      line1: partnerForm.addressLine,
                      reference: partnerForm.addressReference || undefined,
                    },
                    pickupEnabled: true,
                  });

                  setPartnerForm({
                    name: "",
                    slug: "",
                    contactName: "",
                    contactEmail: "",
                    contactPhone: "",
                    addressLine: "",
                    addressReference: "",
                    city: "",
                    state: "",
                  });
                  await loadData();
                  setSelectedPartnerId(createdPartner.id);
                } catch (err) {
                  setError(err instanceof Error ? err.message : "No se pudo crear el partner");
                } finally {
                  setSubmitting(false);
                }
              }}
            >
              Crear Partner con dirección de retiro
            </button>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Dirección y Referidos del Partner</h2>
            <select
              value={selectedPartnerId}
              onChange={(e) => setSelectedPartnerId(e.target.value)}
              className="input-field"
            >
              <option value="">Seleccionar partner</option>
              {partners.map((partner) => (
                <option key={partner.id} value={partner.id}>
                  {partner.name}
                </option>
              ))}
            </select>

            <div className="border rounded-lg p-3 space-y-2">
              <p className="text-sm font-semibold text-gray-800">Dirección cargada (Punto PawGo)</p>
              {selectedPartnerPoint ? (
                <>
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">Local:</span> {selectedPartner?.name}
                  </p>
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">Dirección:</span> {formatAddress(selectedPartnerPoint.address) || "Sin detalle de calle"}
                  </p>
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">Ciudad / Provincia:</span> {selectedPartnerPoint.city || "-"}{selectedPartnerPoint.state ? `, ${selectedPartnerPoint.state}` : ""}
                  </p>
                </>
              ) : (
                <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-2">
                  Este partner no tiene dirección cargada todavía. Crea el partner con dirección para habilitar retiro.
                </p>
              )}
            </div>

            <div className="border rounded-lg p-3 space-y-2">
              <p className="text-sm font-semibold text-gray-800">Nuevo QR/Código del partner</p>
              <p className="text-xs text-gray-500">
                Se vinculará automáticamente a la dirección física del local seleccionada arriba.
              </p>
              <select
                value={referralForm.sourceType}
                onChange={(e) => setReferralForm((prev) => ({ ...prev, sourceType: e.target.value as "local_qr" | "local_code" }))}
                className="input-field"
              >
                <option value="local_qr">QR local</option>
                <option value="local_code">Código local</option>
              </select>
              <input
                value={referralForm.slug}
                onChange={(e) => setReferralForm((prev) => ({ ...prev, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") }))}
                placeholder="Slug (opcional)"
                className="input-field"
              />
              <input
                value={referralForm.code}
                onChange={(e) => setReferralForm((prev) => ({ ...prev, code: e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, "") }))}
                placeholder="Código (opcional)"
                className="input-field"
              />
              <button
                className="btn-secondary w-full"
                disabled={!selectedPartnerId || !selectedPartnerPoint || submitting}
                onClick={async () => {
                  if (!selectedPartnerId) return;
                  try {
                    setSubmitting(true);
                    await partnerAdminAPI.createReferralSource(selectedPartnerId, {
                      partnerPointId: selectedPartnerPoint?.id,
                      sourceType: referralForm.sourceType,
                      slug: referralForm.slug || undefined,
                      code: referralForm.code || undefined,
                      landingTarget: "checkout",
                    });
                    setReferralForm({ sourceType: "local_qr", slug: "", code: "", partnerPointId: "" });
                    await loadData();
                  } catch (err) {
                    setError(err instanceof Error ? err.message : "No se pudo crear la referencia");
                  } finally {
                    setSubmitting(false);
                  }
                }}
              >
                Crear Referencia
              </button>

              <div className="pt-2 border-t border-gray-200 space-y-3">
                <p className="text-sm font-semibold text-gray-800">Referencias existentes</p>
                {(selectedPartner?.referralSources || []).length === 0 && (
                  <p className="text-sm text-gray-500">Aún no hay referencias para este partner.</p>
                )}

                {(selectedPartner?.referralSources || []).map((source) => {
                  const referralUrl = getReferralUrl(source.slug);

                  return (
                    <div key={source.id} className="rounded-lg border border-gray-200 p-3 space-y-2">
                      <div className="flex items-center justify-between gap-2 text-xs text-gray-600">
                        <span>
                          {source.sourceType === "local_qr" ? "QR local" : "Código local"}
                          {source.code ? ` - ${source.code}` : ""}
                        </span>
                        <span className={source.isActive ? "text-emerald-600" : "text-red-600"}>
                          {source.isActive ? "Activo" : "Inactivo"}
                        </span>
                      </div>

                      <p className="text-xs text-gray-500">Slug: {source.slug}</p>

                      <div className="bg-gray-50 border border-gray-200 rounded-md p-2 text-xs break-all text-gray-700">
                        {referralUrl}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => copyReferralUrl(source.slug)}
                          className="px-3 py-1.5 text-xs font-medium rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
                        >
                          {copiedSlug === source.slug ? "Copiado" : "Copiar link"}
                        </button>

                        <button
                          type="button"
                          onClick={() => downloadReferralQr(source.slug, "png")}
                          className="px-3 py-1.5 text-xs font-medium rounded-md border border-primary-turquoise text-primary-turquoise hover:bg-primary-turquoise/5"
                        >
                          Descargar QR PNG
                        </button>

                        <button
                          type="button"
                          onClick={() => downloadReferralQr(source.slug, "svg")}
                          className="px-3 py-1.5 text-xs font-medium rounded-md border border-primary-turquoise text-primary-turquoise hover:bg-primary-turquoise/5"
                        >
                          Descargar QR SVG
                        </button>

                        <a
                          href={referralUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1.5 text-xs font-medium rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
                        >
                          Abrir link
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Pickups pendientes</h2>
            <div className="space-y-3 max-h-[420px] overflow-auto">
              {pickupRequests.length === 0 && (
                <p className="text-sm text-gray-500">No hay retiros pendientes.</p>
              )}
              {pickupRequests.map((request) => (
                <div key={request.id} className="border rounded-lg p-3">
                  <p className="text-sm font-medium text-gray-900">Orden {request.order.id}</p>
                  <p className="text-xs text-gray-600 mt-1">
                    {request.partnerPoint.partner.name} - {request.partnerPoint.name}
                  </p>
                  <p className="text-xs text-gray-600">Cliente: {request.order.lead?.email || "sin email"}</p>
                  <button
                    className="btn-secondary mt-2 w-full"
                    onClick={async () => {
                      try {
                        setSubmitting(true);
                        await partnerAdminAPI.markPickupReady(request.id);
                        await loadData();
                      } catch (err) {
                        setError(err instanceof Error ? err.message : "No se pudo marcar como listo");
                      } finally {
                        setSubmitting(false);
                      }
                    }}
                  >
                    Marcar listo y notificar
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Registrar venta mayorista</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <select
              value={selectedPartnerId}
              onChange={(e) => setSelectedPartnerId(e.target.value)}
              className="input-field"
            >
              <option value="">Seleccionar partner</option>
              {partners.map((partner) => (
                <option key={partner.id} value={partner.id}>
                  {partner.name}
                </option>
              ))}
            </select>
            <input
              value={saleForm.invoiceNumber}
              onChange={(e) => setSaleForm((prev) => ({ ...prev, invoiceNumber: e.target.value }))}
              placeholder="Nro factura/remito (opcional)"
              className="input-field"
            />
            <input
              type="datetime-local"
              value={saleForm.soldAt}
              onChange={(e) => setSaleForm((prev) => ({ ...prev, soldAt: e.target.value }))}
              className="input-field"
            />
          </div>

          <textarea
            value={saleForm.notes}
            onChange={(e) => setSaleForm((prev) => ({ ...prev, notes: e.target.value }))}
            placeholder="Notas de la venta"
            className="input-field"
          />

          <div className="space-y-3">
            {variants.length === 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                No encontramos talles para seleccionar. Verifica que existan variantes cargadas en `Productos`.
              </div>
            )}
            {saleForm.items.map((item, idx) => (
              <div key={idx} className="grid grid-cols-1 md:grid-cols-5 gap-2 border rounded-lg p-3">
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Talle / Variante</label>
                  <select
                    value={item.productVariantId}
                    onChange={(e) => {
                      const next = [...saleForm.items];
                      next[idx] = { ...next[idx], productVariantId: e.target.value };
                      setSaleForm((prev) => ({ ...prev, items: next }));
                    }}
                    className="input-field"
                  >
                    <option value="">Seleccionar talle</option>
                    {variants.map((variant) => (
                      <option key={variant.id} value={variant.id}>
                        {variant.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Cantidad</label>
                  <input
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={(e) => {
                      const next = [...saleForm.items];
                      next[idx] = { ...next[idx], quantity: Number(e.target.value || 0) };
                      setSaleForm((prev) => ({ ...prev, items: next }));
                    }}
                    className="input-field"
                    placeholder="Ej: 2"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Precio mayorista (unitario)</label>
                  <input
                    type="number"
                    min={0}
                    value={item.unitWholesalePrice}
                    onChange={(e) => {
                      const next = [...saleForm.items];
                      next[idx] = { ...next[idx], unitWholesalePrice: Number(e.target.value || 0) };
                      setSaleForm((prev) => ({ ...prev, items: next }));
                    }}
                    className="input-field"
                    placeholder="Ej: 50000"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Costo (unitario)</label>
                  <input
                    type="number"
                    min={0}
                    value={item.unitCost}
                    onChange={(e) => {
                      const next = [...saleForm.items];
                      next[idx] = { ...next[idx], unitCost: Number(e.target.value || 0) };
                      setSaleForm((prev) => ({ ...prev, items: next }));
                    }}
                    className="input-field"
                    placeholder="Ej: 30000"
                  />
                </div>

                {saleForm.items.length > 1 && (
                  <button
                    className="md:col-span-5 text-sm text-red-600 hover:text-red-700 text-left"
                    onClick={() => {
                      setSaleForm((prev) => ({
                        ...prev,
                        items: prev.items.filter((_, i) => i !== idx),
                      }));
                    }}
                  >
                    Eliminar item
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <button
              className="btn-secondary"
              onClick={() =>
                setSaleForm((prev) => ({
                  ...prev,
                  items: [...prev.items, DEFAULT_ITEM],
                }))
              }
            >
              + Agregar talle
            </button>
            <button
              className="btn-primary"
              disabled={
                submitting ||
                !selectedPartnerId ||
                saleForm.items.some(
                  (item) =>
                    !item.productVariantId ||
                    item.quantity <= 0 ||
                    item.unitWholesalePrice < 0 ||
                    item.unitCost < 0
                )
              }
              onClick={async () => {
                if (!selectedPartnerId) return;
                try {
                  setSubmitting(true);
                  await partnerAdminAPI.createWholesaleSale(selectedPartnerId, {
                    soldAt: saleForm.soldAt || undefined,
                    invoiceNumber: saleForm.invoiceNumber || undefined,
                    notes: saleForm.notes || undefined,
                    items: saleForm.items,
                  });
                  setSaleForm({
                    invoiceNumber: "",
                    notes: "",
                    soldAt: "",
                    items: [DEFAULT_ITEM],
                  });
                  await loadData();
                } catch (err) {
                  setError(err instanceof Error ? err.message : "No se pudo registrar la venta");
                } finally {
                  setSubmitting(false);
                }
              }}
            >
              Guardar venta mayorista
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Ventas mayoristas recientes</h2>
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-600 border-b">
                  <th className="py-2 pr-3">Fecha</th>
                  <th className="py-2 pr-3">Partner</th>
                  <th className="py-2 pr-3">Unidades</th>
                  <th className="py-2 pr-3">Ingreso</th>
                  <th className="py-2 pr-3">Costo</th>
                  <th className="py-2 pr-3">Ganancia</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((sale) => (
                  <tr key={sale.id} className="border-b align-top">
                    <td className="py-2 pr-3 text-gray-700">
                      {new Date(sale.soldAt).toLocaleDateString("es-AR")}
                    </td>
                    <td className="py-2 pr-3 text-gray-900">
                      <p className="font-medium">{sale.partner.name}</p>
                      <p className="text-xs text-gray-500">{sale.items.map((item) => item.productVariant.size || item.productVariant.name).join(", ")}</p>
                    </td>
                    <td className="py-2 pr-3">{sale.totalQuantity}</td>
                    <td className="py-2 pr-3">{formatCurrency(Number(sale.totalRevenue))}</td>
                    <td className="py-2 pr-3">{formatCurrency(Number(sale.totalCost))}</td>
                    <td className="py-2 pr-3 font-semibold text-emerald-700">
                      {formatCurrency(Number(sale.totalProfit))}
                    </td>
                  </tr>
                ))}
                {sales.length === 0 && (
                  <tr>
                    <td className="py-6 text-center text-gray-500" colSpan={6}>
                      Aún no hay ventas mayoristas cargadas.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
