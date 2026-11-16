// Brand cards for /car-brands: each brand from "carbrands" with the names of
// its models from "carmodels". Shared by the server page and the client.
const COLORS = [
  "from-red-50 to-red-100",
  "from-blue-50 to-blue-100",
  "from-green-50 to-green-100",
  "from-yellow-50 to-yellow-100",
  "from-purple-50 to-purple-100",
  "from-pink-50 to-pink-100",
  "from-indigo-50 to-indigo-100",
  "from-cyan-50 to-cyan-100",
];

export function mergeBrands(brands, models) {
  const map = {};
  for (const b of brands) {
    if (!b.brandSlug) continue;
    map[b.brandSlug] = {
      name: b.name,
      brandSlug: b.brandSlug,
      logo: b.logo,
      models: [],
      modelCount: 0,
      color: COLORS[b.name.charCodeAt(0) % COLORS.length],
    };
  }
  for (const m of models) {
    const b = map[m.brandSlug];
    if (b) {
      b.models.push(m.name);
      b.modelCount++;
    }
  }
  return Object.values(map).sort((a, b) => a.name.localeCompare(b.name));
}
