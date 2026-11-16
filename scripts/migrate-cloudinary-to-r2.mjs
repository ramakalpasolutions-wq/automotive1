// Copies every Cloudinary image referenced in MongoDB to Cloudflare R2 and
// rewrites the records to point at R2. Cloudinary files are NOT deleted.
//
//   node --env-file=.env.local scripts/migrate-cloudinary-to-r2.mjs           # dry run
//   node --env-file=.env.local scripts/migrate-cloudinary-to-r2.mjs --apply   # do it
//
// Before changing anything, --apply writes every affected document to
// scripts/backups/ so the change can be reverted.

import { MongoClient } from "mongodb";
import { S3Client, PutObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { mkdirSync, writeFileSync } from "node:fs";

const APPLY = process.argv.includes("--apply");
const env = process.env;
for (const k of ["MONGODB_URI", "R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET", "NEXT_PUBLIC_R2_PUBLIC_URL"]) {
  if (!env[k]) throw new Error(`${k} missing in .env.local`);
}

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: env.R2_ACCESS_KEY_ID, secretAccessKey: env.R2_SECRET_ACCESS_KEY },
});
const PUBLIC = env.NEXT_PUBLIC_R2_PUBLIC_URL.replace(/\/$/, "");
const publicUrl = key => `${PUBLIC}/${key.split("/").map(encodeURIComponent).join("/")}`;

const CLD = /^https?:\/\/res\.cloudinary\.com\//;

// https://res.cloudinary.com/<cloud>/image/upload/[transforms/][v123/]<public_id>.<ext>
function parseCloudinary(url) {
  const u = new URL(url);
  const parts = u.pathname.split("/").filter(Boolean);
  const i = parts.indexOf("upload");
  if (i < 0) return null;
  let rest = parts.slice(i + 1);
  const v = rest.findIndex(p => /^v\d+$/.test(p));
  if (v >= 0) rest = rest.slice(v + 1);
  else while (rest.length > 1 && /[,_]/.test(rest[0]) && /^[a-z]{1,3}_/.test(rest[0])) rest = rest.slice(1);
  const path = rest.map(decodeURIComponent).join("/");
  const dot = path.lastIndexOf(".");
  const publicId = dot > path.lastIndexOf("/") ? path.slice(0, dot) : path;
  const ext = dot > path.lastIndexOf("/") ? path.slice(dot).toLowerCase() : "";
  return { publicId, ext };
}

// Walk a document and collect / replace string values.
function walk(value, fn) {
  if (typeof value === "string") return fn(value);
  if (Array.isArray(value)) return value.map(v => walk(v, fn));
  if (value && typeof value === "object" && value.constructor === Object) {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = walk(v, fn);
    return out;
  }
  return value;
}

const client = await new MongoClient(env.MONGODB_URI).connect();
const dbNames = [...new Set(["automotivecarcare", client.db().databaseName])];

// 1. Find every document that references Cloudinary.
const hits = []; // { db, coll, doc, urls }
const allUrls = new Map(); // url -> { publicId, ext }
for (const dbName of dbNames) {
  const db = client.db(dbName);
  for (const { name } of await db.listCollections({}, { nameOnly: true }).toArray()) {
    if (name.startsWith("system.")) continue;
    for await (const doc of db.collection(name).find({})) {
      const urls = new Set();
      walk(doc, s => (CLD.test(s) && urls.add(s), s));
      if (!urls.size) continue;
      for (const url of urls) {
        const p = parseCloudinary(url);
        if (p) allUrls.set(url, p);
      }
      hits.push({ db: dbName, coll: name, doc, urls: [...urls] });
    }
  }
}

// Homepage hero images live only in a Cloudinary folder (not in MongoDB).
// List them with the Cloudinary Admin API so they get copied as well.
let heroCount = 0;
if (env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET) {
  const auth = Buffer.from(`${env.CLOUDINARY_API_KEY}:${env.CLOUDINARY_API_SECRET}`).toString("base64");
  let cursor;
  do {
    const q = new URLSearchParams({ prefix: "automotive-carcare/hero-images", max_results: "500" });
    if (cursor) q.set("next_cursor", cursor);
    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/resources/image/upload?${q}`,
      { headers: { Authorization: `Basic ${auth}` } }
    );
    if (!res.ok) { console.log(`Could not list Cloudinary hero images: ${res.status}`); break; }
    const data = await res.json();
    for (const r of data.resources || []) {
      allUrls.set(r.secure_url, { publicId: r.public_id, ext: r.format ? `.${r.format}` : "" });
      heroCount++;
    }
    cursor = data.next_cursor;
  } while (cursor);
} else {
  console.log("Cloudinary keys not set: hero images will not be copied.");
}
console.log(`Hero images in Cloudinary: ${heroCount}`);

const byColl = {};
for (const h of hits) byColl[`${h.db}.${h.coll}`] = (byColl[`${h.db}.${h.coll}`] || 0) + 1;
console.log(`Databases scanned: ${dbNames.join(", ")}`);
console.log(`Records using Cloudinary images:`, byColl);
console.log(`Unique Cloudinary images: ${allUrls.size}`);

if (!APPLY) {
  for (const [url, p] of [...allUrls].slice(0, 5)) console.log(`  e.g. ${p.publicId}${p.ext}  <-  ${url}`);
  console.log("\nDry run only. Re-run with --apply to copy images and update records.");
  await client.close();
  process.exit(0);
}

// 2. Back up affected documents.
mkdirSync("scripts/backups", { recursive: true });
const backupFile = `scripts/backups/cloudinary-migration-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
writeFileSync(backupFile, JSON.stringify(hits.map(h => ({ db: h.db, coll: h.coll, doc: h.doc })), null, 2));
console.log(`Backup written: ${backupFile}`);

// 3. Copy each image to R2 (key = Cloudinary public_id + extension).
const urlMap = new Map(); // old url -> new url
const idMap = new Map(); // old public_id -> new key
const failed = [];
let n = 0;
for (const [url, { publicId, ext }] of allUrls) {
  n++;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`download ${res.status}`);
    const type = res.headers.get("content-type") || "application/octet-stream";
    const fileExt = ext || "." + (type.split("/")[1] || "bin").split(";")[0];
    const key = publicId + fileExt;
    let exists = false;
    try { await s3.send(new HeadObjectCommand({ Bucket: env.R2_BUCKET, Key: key })); exists = true; } catch {}
    if (!exists) {
      const body = Buffer.from(await res.arrayBuffer());
      await s3.send(new PutObjectCommand({ Bucket: env.R2_BUCKET, Key: key, Body: body, ContentType: type }));
    }
    urlMap.set(url, publicUrl(key));
    idMap.set(publicId, key);
    console.log(`[${n}/${allUrls.size}] ${exists ? "already in R2" : "copied"}: ${key}`);
  } catch (err) {
    failed.push({ url, error: err.message });
    console.log(`[${n}/${allUrls.size}] FAILED ${url}: ${err.message}`);
  }
}

// 4. Rewrite records: old URLs -> R2 URLs, old public IDs -> R2 keys.
let updated = 0;
for (const h of hits) {
  const { _id, ...rest } = h.doc;
  const next = walk(rest, s => urlMap.get(s) ?? idMap.get(s) ?? s);
  if (JSON.stringify(next) === JSON.stringify(rest)) continue;
  await client.db(h.db).collection(h.coll).updateOne({ _id }, { $set: next });
  updated++;
}

console.log(`\nDone. Images copied: ${urlMap.size}, failed: ${failed.length}, records updated: ${updated}`);
if (failed.length) console.log("Failed images (records using them were left on Cloudinary):", failed);
await client.close();
