// Server-side data loaders. Pages use these so their content is in the first
// HTML response (what Google indexes), instead of loading after the page opens.
import clientPromise from "@/lib/mongodb";

const DB = "automotivecarcare";

// MongoDB documents → plain JSON that can be passed to client components.
const plain = docs => JSON.parse(JSON.stringify(docs));

async function load(collection, query = {}, sort = { order: 1 }) {
  try {
    const client = await clientPromise;
    return plain(await client.db(DB).collection(collection).find(query).sort(sort).toArray());
  } catch (err) {
    console.error(`data: ${collection} failed:`, err.message);
    return [];
  }
}

export const getDetailedServices = () => load("detailed-services");
export const getSpecialServices = () => load("special-services");
export const getCarBrands = () => load("carbrands", {}, { name: 1 });
export const getCarModels = brandSlug =>
  load("carmodels", brandSlug ? { brandSlug } : {}, { brand: 1, name: 1 });

export async function getCarModel(brandSlug, slug) {
  return (await getCarModels(brandSlug)).find(m => m.slug === slug) || null;
}

// Every service with one shape, for service pages and links.
export async function getAllServices() {
  const [general, special] = await Promise.all([getDetailedServices(), getSpecialServices()]);
  return [
    ...general.map(s => ({ ...s, kind: "general", hero: s.image })),
    ...special.map(s => ({ ...s, kind: "special", hero: s.heroImage })),
  ].filter(s => s.slug);
}

export async function getService(slug) {
  return (await getAllServices()).find(s => s.slug === slug) || null;
}

// Service names in the database contain emoji and decorations; strip them for
// headings, titles and structured data.
export function cleanName(name) {
  const s = String(name || "")
    .replace(/\p{Extended_Pictographic}|️|‍/gu, "")
    .replace(/\s*\(([^)]*)\)\s*/g, " ($1) ")
    .replace(/\s+/g, " ")
    .trim();
  // ALL-CAPS names → Title Case, keep short acronyms (ABS, ECU, AC)
  return s === s.toUpperCase()
    ? s.toLowerCase().replace(/\b\w+/g, w => (w.length <= 3 && /^(ac|abs|ecu|ecm)$/.test(w) ? w.toUpperCase() : w[0].toUpperCase() + w.slice(1)))
    : s;
}

export function cleanText(text) {
  return String(text || "")
    .replace(/\p{Extended_Pictographic}|️|‍/gu, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
