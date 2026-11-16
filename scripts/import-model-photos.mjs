// Finds a freely licensed photo (Wikimedia Commons, via Wikipedia) for every
// car model in "vehicleBrands", uploads it to Cloudflare R2 and saves it in
// "carmodels" with photographer credit and licence.
//
//   node --env-file=.env.local scripts/import-model-photos.mjs            # dry run: writes plan, changes nothing
//   node --env-file=.env.local scripts/import-model-photos.mjs --apply    # upload + save
//
// Options: --plan=<file>  where the matching plan is cached (default scripts/backups/model-photo-plan.json)
//          --skip=<Article title>,<...>   drop matches you judged wrong after the dry run

import { MongoClient } from "mongodb";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

const arg = n => process.argv.find(a => a.startsWith(`--${n}=`))?.split("=").slice(1).join("=");
const APPLY = process.argv.includes("--apply");
const PLAN = arg("plan") || "scripts/backups/model-photo-plan.json";
const SKIP = new Set((arg("skip") || "").split(",").map(s => s.trim()).filter(Boolean));
const UA = "AutomotiveCarCareSite/1.0 (model photo import; https://www.automotivecarcare.in)";
const env = process.env;

const norm = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
const slugify = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const sleep = ms => new Promise(r => setTimeout(r, ms));
const stripHtml = s => String(s || "").replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();

// Words an article title may start with for each brand.
const BRAND_WORDS = {
  skoda: ["skoda"], audi: ["audi"], volkswagen: ["volkswagen"], bmw: ["bmw"], volvo: ["volvo"],
  "mercedes-benz": ["mercedesbenz", "mercedesamg", "mercedesmaybach", "maybach"],
  mahindra: ["mahindra"], ford: ["ford"], toyota: ["toyota"], "maruti-suzuki": ["marutisuzuki", "maruti", "suzuki"],
  hyundai: ["hyundai"], kia: ["kia"], honda: ["honda"], renault: ["renault"], nissan: ["nissan", "datsun"],
  tata: ["tata"], mg: ["mg", "mgmotor", "mgzs", "mgcomet", "mghector", "mgastor", "mggloster", "baojun", "wuling", "roewe"],
};
// What to type before the model name when searching.
const SEARCH_BRAND = { "maruti-suzuki": "Maruti Suzuki", "mercedes-benz": "Mercedes-Benz", mg: "MG", skoda: "Škoda" };

async function wiki(params, host = "en.wikipedia.org") {
  const url = `https://${host}/w/api.php?${new URLSearchParams({ format: "json", formatversion: "2", origin: "*", ...params })}`;
  for (let i = 0; i < 4; i++) {
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (res.status === 429 || res.status >= 500) { await sleep(2000 * (i + 1)); continue; }
    return res.json();
  }
  throw new Error(`Wikipedia API failed: ${url}`);
}

const mongo = await new MongoClient(env.MONGODB_URI).connect();
const db = mongo.db("automotivecarcare");
const vehicleBrands = await db.collection("vehicleBrands").find().toArray();
const carBrands = await db.collection("carbrands").find().toArray();

function brandFor(vb) {
  const key = norm(vb.name);
  const first = norm(String(vb.name).split(/[,(]/)[0]);
  return carBrands.find(c => { const k = norm(c.name); return k === key || key.startsWith(k) || k === first; });
}

// ── 1. Build or load the plan ─────────────────────────────────────────────
let plan = existsSync(PLAN) ? JSON.parse(readFileSync(PLAN, "utf8")) : null;

if (!plan) {
  plan = { models: [], articles: {} }; // models: {brandSlug, brand, variant, article|null}
  const searchCache = {};
  const search = async q => {
    if (searchCache[q]) return searchCache[q];
    const data = await wiki({
      action: "query", generator: "search", gsrsearch: q, gsrlimit: "5", gsrnamespace: "0",
      prop: "pageimages", piprop: "thumbnail|name", pithumbsize: "900", pilicense: "free",
    });
    await sleep(120);
    return (searchCache[q] = (data.query?.pages || []).sort((a, b) => a.index - b.index));
  };

  // Article title -> bare model name ("Suzuki Baleno (2015)" -> "Baleno").
  const PREFIXES = ["Maruti Suzuki", "Maruti", "Suzuki", "Mercedes-Benz", "Mercedes-AMG", "Mercedes-Maybach",
    "Škoda", "Skoda", "MG Motor", "MG", "Volkswagen", "Audi", "BMW", "Volvo", "Mahindra", "Ford", "Toyota",
    "Hyundai", "Kia", "Honda", "Renault", "Nissan", "Tata"];
  const titleModel = title => {
    let t = title.replace(/\s*\(.*?\)\s*/g, " ").trim();
    for (const p of PREFIXES) if (t.toLowerCase().startsWith(p.toLowerCase() + " ")) { t = t.slice(p.length).trim(); break; }
    return t;
  };
  // Does `model` match the start of `variant` on a word boundary? ("Creta" ~ "Creta SX(O)", "Wagon R" ~ "WagonR LXI")
  const prefixOf = (model, variant) => {
    const target = norm(model);
    if (!target) return false;
    let acc = "";
    for (let i = 0; i < variant.length; i++) {
      acc += norm(variant[i]);
      if (acc === target) return i + 1 === variant.length || /[^a-z0-9]/i.test(variant[i + 1]);
      if (!target.startsWith(acc)) return false;
    }
    return false;
  };
  // Model families whose trim names don't start with the article name.
  const family = (brandSlug, v) => {
    let m;
    if (brandSlug === "bmw") {
      if ((m = v.match(/^(\d)\d\d/))) return `${m[1]} Series`;
      if ((m = v.match(/^i7\b/))) return "i7";
    }
    if (brandSlug === "mercedes-benz") {
      if ((m = v.match(/^Maybach\s+(GLS|S)\b/i))) return m[1].toUpperCase() === "S" ? "Maybach S-Class" : "Maybach GLS";
      if ((m = v.match(/^(CLA|GLA|GLB|GLC|GLE|GLS|EQA|EQB|EQC|EQE|EQS)\b/i))) return m[1].toUpperCase();
      if ((m = v.match(/^([ABCEGSV])\s?\d/))) return `${m[1]}-Class`;
    }
    return null;
  };

  // Hand-checked Wikipedia articles for models that search gets wrong or misses.
  // Indian-market twins/rebadges use the sister model's photo (same body).
  const ALIASES = {
    hyundai: { "Grand i10 Nios": "Hyundai Grand i10 Nios", "Grand i10": "Hyundai Grand i10", "Elite i20": "Hyundai i20", Verna: "Hyundai Verna" },
    renault: { Duster: "Dacia Duster", Lodgy: "Dacia Lodgy", Pulse: "Nissan Micra (K13)", Scala: "Nissan Versa" },
    nissan: { Terrano: "Nissan Terrano (2013)", Evalia: "Nissan NV200", Sunny: "Nissan Versa" },
    honda: { Jazz: "Honda Fit" },
    mg: { "Hector Plus": "MG Hector", Hector: "MG Hector", Astor: "MG ZS (crossover)", Gloster: "Maxus D90", "Comet EV": "MG Comet EV" },
    ford: { Endeavour: "Ford Everest", Aspire: "Ford Figo Aspire", Classic: "Ford Fiesta", Freestyle: "Ford Freestyle (India)" },
    toyota: { Glanza: "Suzuki Baleno (2015)", Rumion: "Suzuki Ertiga", Prado: "Toyota Land Cruiser Prado", Vellfire: "Toyota Vellfire", "Urban Cruiser Hyryder": "Toyota Urban Cruiser Hyryder", "Urban Cruiser": "Toyota Urban Cruiser (2020)" },
    "maruti-suzuki": { Ritz: "Suzuki Splash", XL6: "Suzuki XL6", "Vitara Brezza": "Suzuki Brezza", Baleno: "Suzuki Baleno (2015)" },
    mahindra: { TUV300: "Mahindra TUV300", XUV400: "Mahindra XUV400", Alturas: "SsangYong Rexton" },
    skoda: { Laura: "Škoda Octavia (1Z)" },
    volkswagen: { Ameo: "Volkswagen Ameo" },
    audi: { A8L: "Audi A8", RS5: "Audi RS 5", "Q8 e-tron": "Audi Q8 e-tron" },
    bmw: { i7: "BMW 7 Series (G70)" },
    volvo: { "C40 Recharge": "Volvo EC40" },
    "mercedes-benz": { V220d: "Mercedes-Benz V-Class", "Maybach S": "Mercedes-Maybach S-Class", "Maybach GLS": "Mercedes-Maybach GLS", GLC: "Mercedes-Benz GLC", EQS: "Mercedes-Benz EQS" },
  };
  const aliasFor = (brandSlug, v) =>
    Object.keys(ALIASES[brandSlug] || {})
      .sort((a, b) => b.length - a.length)
      .find(k => prefixOf(k, v) || (k === "Maybach S" && /^Maybach S\d/.test(v)) || (k === "GLC" && /^GLC\b/.test(v)) || (k === "EQS" && /^EQS\b/.test(v)));
  const pageCache = {};
  const fetchPage = async title => {
    if (pageCache[title] !== undefined) return pageCache[title];
    const data = await wiki({ action: "query", titles: title, redirects: "1", prop: "pageimages", piprop: "thumbnail|name", pithumbsize: "900", pilicense: "free" });
    await sleep(120);
    const p = data.query?.pages?.[0];
    return (pageCache[title] = p && !p.missing && p.thumbnail ? { title: p.title, file: p.pageimage, thumb: p.thumbnail.source } : null);
  };

  for (const vb of vehicleBrands) {
    const cb = brandFor(vb);
    if (!cb) { console.log(`No carbrands entry for ${vb.name}, skipped`); continue; }
    const words = BRAND_WORDS[cb.brandSlug] || [norm(cb.name)];
    const brandQ = SEARCH_BRAND[cb.brandSlug] || cb.name;
    const names = (vb.models || []).flatMap(m => String(m).split(/\n+/)).map(m => m.trim()).filter(Boolean);
    for (const variant of [...new Set(names)]) {
      const alias = aliasFor(cb.brandSlug, variant);
      if (alias) {
        const hit = await fetchPage(ALIASES[cb.brandSlug][alias]);
        plan.models.push({ brandSlug: cb.brandSlug, brand: cb.name, variant, article: hit?.title || null, modelName: alias });
        if (hit) plan.articles[hit.title] ??= { ...hit, brandSlug: cb.brandSlug, brand: cb.name };
        process.stdout.write(hit ? "a" : "x");
        continue;
      }
      const fam = family(cb.brandSlug, variant);
      const tokens = variant.split(/\s+/);
      const queries = fam ? [fam] : [...new Set([tokens.slice(0, 3).join(" "), tokens.slice(0, 2).join(" "), tokens[0]])];
      let best = null;
      for (const qPart of queries) {
        const pages = await search(`${brandQ} ${qPart}`);
        for (const p of pages) {
          if (!p.thumbnail || !words.some(w => norm(p.title).startsWith(w))) continue;
          const tm = titleModel(p.title);
          const ok = fam ? norm(p.title).includes(norm(fam)) : prefixOf(tm, variant);
          if (!ok) continue;
          // Longest matching model name wins; among equals, the plain article (no "(generation)") wins.
          const score = norm(tm).length * 10 + (/\(/.test(p.title) ? 0 : 5) - p.index;
          if (!best || score > best.score) best = { score, title: p.title, file: p.pageimage, thumb: p.thumbnail.source };
        }
        if (best) break;
      }
      const hit = best ? { title: best.title, file: best.file, thumb: best.thumb } : null;
      plan.models.push({
        brandSlug: cb.brandSlug, brand: cb.name, variant, article: hit?.title || null,
        modelName: hit ? fam || titleModel(hit.title) : null,
      });
      if (hit) plan.articles[hit.title] ??= { ...hit, brandSlug: cb.brandSlug, brand: cb.name };
      process.stdout.write(hit ? "." : "x");
    }
  }
  console.log();

  // Photographer credit and licence for each photo (Commons).
  const titles = Object.values(plan.articles).map(a => `File:${a.file}`);
  for (let i = 0; i < titles.length; i += 40) {
    const data = await wiki({ action: "query", titles: titles.slice(i, i + 40).join("|"), prop: "imageinfo", iiprop: "extmetadata|url" }, "commons.wikimedia.org");
    for (const p of data.query?.pages || []) {
      const m = p.imageinfo?.[0]?.extmetadata || {};
      const art = Object.values(plan.articles).find(a => `File:${a.file}`.replace(/_/g, " ") === p.title);
      if (!art) continue;
      art.author = stripHtml(m.Artist?.value) || "Unknown";
      art.license = stripHtml(m.LicenseShortName?.value) || "";
      art.licenseUrl = m.LicenseUrl?.value || "";
      art.source = p.imageinfo?.[0]?.descriptionurl || `https://commons.wikimedia.org/wiki/${encodeURIComponent(p.title)}`;
    }
    await sleep(150);
  }
  mkdirSync(PLAN.split("/").slice(0, -1).join("/") || ".", { recursive: true });
  writeFileSync(PLAN, JSON.stringify(plan, null, 2));
  console.log(`Plan saved: ${PLAN}`);
}

// ── 2. Group trims into models and report ────────────────────────────────
// Usable = free licence that only needs credit (GFDL-only files are left out).
const usable = a => a && !SKIP.has(a.title) && a.license && !/fair use|non-free|^GFDL/i.test(a.license);
const groups = {}; // "brandSlug/model-slug" -> { brandSlug, brand, name, slug, votes: {title: n}, variants: [] }
for (const m of plan.models) {
  const a = plan.articles[m.article];
  if (!usable(a) || !m.modelName) continue;
  const slug = slugify(m.modelName);
  const g = (groups[`${m.brandSlug}/${slug}`] ??= { brandSlug: m.brandSlug, brand: m.brand, name: m.modelName, slug, votes: {}, variants: [] });
  g.votes[m.article] = (g.votes[m.article] || 0) + 1;
  g.variants.push(m.variant);
}
for (const g of Object.values(groups)) {
  // Photo used by most trims; on a tie prefer the main article over a "(generation)" one.
  g.article = Object.entries(g.votes).sort((x, y) => y[1] - x[1] || /\(/.test(x[0]) - /\(/.test(y[0]))[0][0];
}
const covered = new Set(Object.values(groups).flatMap(g => g.variants.map(v => `${g.brandSlug}/${v}`)));
const missing = plan.models.filter(m => !covered.has(`${m.brandSlug}/${m.variant}`));
console.log(`Models: ${plan.models.length}, with photo: ${plan.models.length - missing.length}, without: ${missing.length}`);
console.log(`Distinct photos: ${Object.keys(groups).length}\n`);
for (const g of Object.values(groups)) {
  const a = plan.articles[g.article];
  console.log(`${g.brand.padEnd(14)} ${g.name.padEnd(22)} ${g.article.padEnd(38)} ${String(a.license).padEnd(15)} <- ${g.variants.slice(0, 5).join(", ")}${g.variants.length > 5 ? ` (+${g.variants.length - 5})` : ""}`);
}
if (missing.length) console.log(`\nNo photo: ${missing.map(m => `${m.brand} ${m.variant}`).join("; ")}`);

if (!APPLY) {
  console.log("\nDry run only. Review the list, then re-run with --apply (and --skip=... for wrong matches).");
  await mongo.close();
  process.exit(0);
}

// ── 3. Upload + save ──────────────────────────────────────────────────────
const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: env.R2_ACCESS_KEY_ID, secretAccessKey: env.R2_SECRET_ACCESS_KEY },
});
const PUBLIC = env.NEXT_PUBLIC_R2_PUBLIC_URL.replace(/\/$/, "");
const col = db.collection("carmodels");
let saved = 0, kept = 0, failed = 0;

for (const g of Object.values(groups)) {
  const a = plan.articles[g.article];
  const existing = await col.findOne({ brandSlug: g.brandSlug, slug: g.slug });
  if (existing?.image && !existing.photoSource) {
    // An admin uploaded this photo: keep it, just record which trims it covers.
    await col.updateOne({ _id: existing._id }, { $addToSet: { variants: { $each: g.variants } } });
    kept++;
    continue;
  }
  const res = await fetch(a.thumb, { headers: { "User-Agent": UA } });
  if (!res.ok) { console.log(`download failed (${res.status}): ${g.article}`); failed++; continue; }
  const type = res.headers.get("content-type") || "image/jpeg";
  const ext = type.includes("png") ? ".png" : type.includes("webp") ? ".webp" : ".jpg";
  const key = `automotive-carcare/car-models/${g.brandSlug}/${g.slug}${ext}`;
  await s3.send(new PutObjectCommand({ Bucket: env.R2_BUCKET, Key: key, Body: Buffer.from(await res.arrayBuffer()), ContentType: type }));
  const doc = {
    brand: g.brand, brandSlug: g.brandSlug, name: g.name, slug: g.slug,
    image: `${PUBLIC}/${key}`, cloudinaryPublicId: key,
    variants: g.variants,
    photoCredit: a.author, photoLicense: a.license, photoLicenseUrl: a.licenseUrl, photoSource: a.source,
    updatedAt: new Date(),
  };
  await col.updateOne(
    { brandSlug: g.brandSlug, slug: g.slug },
    { $set: doc, $setOnInsert: { createdAt: new Date(), serviceCount: 6 } },
    { upsert: true }
  );
  saved++;
  process.stdout.write(".");
  await sleep(100);
}
console.log(`\nSaved ${saved} model photos, kept ${kept} admin photos, ${failed} downloads failed.`);
await mongo.close();
