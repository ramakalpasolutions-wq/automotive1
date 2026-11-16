import { SITE_URL } from "@/lib/site";

// Served at /sitemap.xml — rebuilt at most once a day.
export const revalidate = 86400;

const slugify = s =>
  String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const withTimeout = (p, ms) =>
  Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), ms))]);

// Car brand and model pages come from the database. If it can't be reached,
// the sitemap still lists every fixed page.
async function carPages() {
  try {
    const { default: clientPromise } = await import("@/lib/mongodb");
    const client = await withTimeout(clientPromise, 5000);
    const [models, brands] = await withTimeout(
      Promise.all([
        client.db().collection("carmodels")
          .find({}, { projection: { brandSlug: 1, slug: 1, updatedAt: 1, createdAt: 1 } }).toArray(),
        client.db("automotivecarcare").collection("carbrands")
          .find({}, { projection: { name: 1, brandSlug: 1, slug: 1, updatedAt: 1 } }).toArray(),
      ]),
      5000
    );

    const brandSlugs = new Set([
      ...brands.map(b => b.brandSlug || b.slug || slugify(b.name)),
      ...models.map(m => m.brandSlug),
    ].filter(Boolean));

    return [
      ...[...brandSlugs].map(slug => ({
        url: `${SITE_URL}/car-brands/${slug}`,
        changeFrequency: "monthly",
        priority: 0.6,
      })),
      ...models
        .filter(m => m.brandSlug && m.slug)
        .map(m => ({
          url: `${SITE_URL}/car-brands/${m.brandSlug}/${m.slug}`,
          lastModified: m.updatedAt || m.createdAt,
          changeFrequency: "monthly",
          priority: 0.5,
        })),
    ];
  } catch (err) {
    console.warn("sitemap: car pages skipped:", err.message);
    return [];
  }
}

export default async function sitemap() {
  const now = new Date();
  const fixed = [
    { path: "", priority: 1, changeFrequency: "weekly" },
    { path: "/services", priority: 0.9, changeFrequency: "weekly" },
    { path: "/service", priority: 0.8, changeFrequency: "monthly" },
    { path: "/special-services", priority: 0.8, changeFrequency: "monthly" },
    { path: "/booking", priority: 0.9, changeFrequency: "monthly" },
    { path: "/car-brands", priority: 0.7, changeFrequency: "monthly" },
    { path: "/contact", priority: 0.8, changeFrequency: "yearly" },
  ].map(({ path, ...rest }) => ({ url: `${SITE_URL}${path}`, lastModified: now, ...rest }));

  return [...fixed, ...(await carPages())];
}
