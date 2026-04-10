import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const GEOREF_BASE_URL = "https://apis.datos.gob.ar/georef/api";

const STATIC_PROVINCIAS = [
  { id: "06", nombre: "Buenos Aires" },
  { id: "10", nombre: "Catamarca" },
  { id: "22", nombre: "Chaco" },
  { id: "26", nombre: "Chubut" },
  { id: "02", nombre: "Ciudad Autónoma de Buenos Aires" },
  { id: "14", nombre: "Córdoba" },
  { id: "18", nombre: "Corrientes" },
  { id: "30", nombre: "Entre Ríos" },
  { id: "34", nombre: "Formosa" },
  { id: "38", nombre: "Jujuy" },
  { id: "42", nombre: "La Pampa" },
  { id: "46", nombre: "La Rioja" },
  { id: "50", nombre: "Mendoza" },
  { id: "54", nombre: "Misiones" },
  { id: "58", nombre: "Neuquén" },
  { id: "62", nombre: "Río Negro" },
  { id: "66", nombre: "Salta" },
  { id: "70", nombre: "San Juan" },
  { id: "74", nombre: "San Luis" },
  { id: "78", nombre: "Santa Cruz" },
  { id: "82", nombre: "Santa Fe" },
  { id: "86", nombre: "Santiago del Estero" },
  { id: "94", nombre: "Tierra del Fuego, Antártida e Islas del Atlántico Sur" },
  { id: "90", nombre: "Tucumán" },
];

function normalizeName(value) {
  return value.normalize("NFC").trim();
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText} (${url})`);
  }

  return response.json();
}

async function fetchMunicipios(provinciaId) {
  const url = `${GEOREF_BASE_URL}/municipios?provincia=${provinciaId}&campos=id,nombre,provincia&max=1000&orden=nombre`;
  const data = await fetchJson(url);
  return Array.isArray(data.municipios) ? data.municipios : [];
}

async function fetchLocalidades(provinciaId) {
  const url = `${GEOREF_BASE_URL}/localidades?provincia=${provinciaId}&campos=id,nombre,provincia&max=5000&orden=nombre`;
  const data = await fetchJson(url);
  return Array.isArray(data.localidades) ? data.localidades : [];
}

function sortByNombre(list) {
  return list.sort((a, b) => a.nombre.localeCompare(b.nombre, "es-AR"));
}

async function main() {
  const byProvincia = {};

  for (const provincia of [...STATIC_PROVINCIAS].sort((a, b) => a.id.localeCompare(b.id))) {
    const municipios = await fetchMunicipios(provincia.id);

    let source = "municipios";
    let rawCiudades = municipios;

    if (municipios.length === 0) {
      const localidades = await fetchLocalidades(provincia.id);
      rawCiudades = localidades;
      source = "localidades";
    }

    const ciudades = sortByNombre(
      rawCiudades.map((item) => ({
        id: String(item.id),
        nombre: normalizeName(String(item.nombre)),
        provinciaId: provincia.id,
        provinciaNombre: provincia.nombre,
      }))
    );

    byProvincia[provincia.id] = ciudades;
    console.log(`${provincia.id}\t${provincia.nombre}\t${ciudades.length}\t${source}`);
  }

  const outputPath = resolve(process.cwd(), "src", "services", "geo.static-data.ts");
  const content = `// Archivo autogenerado por scripts/generate-static-ciudades.mjs\n\nexport interface StaticCiudadDTO {\n  id: string;\n  nombre: string;\n  provinciaId: string;\n  provinciaNombre: string;\n}\n\nexport const STATIC_CIUDADES_BY_PROVINCIA: Record<string, StaticCiudadDTO[]> = ${JSON.stringify(byProvincia, null, 2)};\n`;

  await writeFile(outputPath, content, "utf8");
  console.log(`\nArchivo generado: ${outputPath}`);
}

main().catch((error) => {
  console.error("Error generando ciudades estáticas:", error);
  process.exit(1);
});
