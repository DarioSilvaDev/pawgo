import { fetchAPI } from "./auth";

export interface Lead {
  id: string;
  email: string;
  name?: string;
  dogSize?: "small" | "medium" | "large" | "extra_large";
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateLeadDto {
  email: string;
  name?: string;
  dogSize?: "small" | "medium" | "large" | "extra_large";
}

export async function getLeads(filters?: {
  search?: string;
  dogSize?: string;
  startDate?: string;
  endDate?: string;
}): Promise<{ leads: Lead[] }> {
  const params = new URLSearchParams();
  if (filters?.search) params.append("search", filters.search);
  if (filters?.dogSize) params.append("dogSize", filters.dogSize);
  if (filters?.startDate) params.append("startDate", filters.startDate);
  if (filters?.endDate) params.append("endDate", filters.endDate);

  const query = params.toString();
  const endpoint = `/leads${query ? `?${query}` : ""}`;
  const response = await fetchAPI(endpoint);
  return response.json();
}

export async function getLead(id: string): Promise<Lead> {
  const response = await fetchAPI(`/leads/${id}`);
  return response.json();
}

export async function deleteLead(id: string): Promise<void> {
  await fetchAPI(`/leads/${id}`, {
    method: "DELETE",
  });
}

export async function exportLeadsToCSV(leads: Lead[]): Promise<string> {
  const getDogSizeLabel = (size?: string) => {
    const labels: Record<string, string> = {
      small: "Pequeño",
      medium: "Mediano",
      large: "Grande",
      extra_large: "Extra Grande",
    };
    return size ? labels[size] || size : "No especificado";
  };

  const headers = ["Email", "Nombre", "Tamaño de Perro", "Fecha de Creación"];
  const rows = leads.map((lead) => [
    lead.email,
    lead.name || "",
    getDogSizeLabel(lead.dogSize),
    new Date(lead.createdAt).toLocaleString("es-AR"),
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")),
  ].join("\n");

  // Add UTF-8 BOM for Excel compatibility
  const BOM = "\uFEFF";
  return BOM + csvContent;
}

