import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Cloudflare R2 (S3-compatible) storage.
// Files are uploaded straight from the browser to R2 using presigned URLs,
// so they never pass through the Next.js server and its request-size limits.

const {
  R2_ACCOUNT_ID,
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
  R2_BUCKET,
  NEXT_PUBLIC_R2_PUBLIC_URL,
} = process.env;

export const BUCKET = R2_BUCKET;
export const HERO_PREFIX = "automotive-carcare/hero-images/";
const URL_TTL = 60 * 60; // presigned URLs valid for 1 hour

let client;
export function r2() {
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET) {
    throw new Error("Cloudflare R2 credentials missing in .env.local");
  }
  client ??= new S3Client({
    region: "auto",
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
  });
  return client;
}

export function publicUrl(key) {
  const base = (NEXT_PUBLIC_R2_PUBLIC_URL || "").replace(/\/$/, "");
  return `${base}/${key.split("/").map(encodeURIComponent).join("/")}`;
}

// Build a safe, unique object key inside a folder.
export function makeKey(folder, filename) {
  const cleanFolder = String(folder || "automotive-carcare/uploads")
    .replace(/[^a-zA-Z0-9/_-]/g, "")
    .replace(/^\/+|\/+$/g, "");
  const dot = filename.lastIndexOf(".");
  const ext = dot > -1 ? filename.slice(dot).toLowerCase().replace(/[^a-z0-9.]/g, "") : "";
  const base = (dot > -1 ? filename.slice(0, dot) : filename)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60) || "file";
  return `${cleanFolder}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}-${base}${ext}`;
}

export const presignPut = (key, contentType) =>
  getSignedUrl(
    r2(),
    new PutObjectCommand({ Bucket: BUCKET, Key: key, ContentType: contentType || undefined }),
    { expiresIn: URL_TTL }
  );

export const createMultipart = async (key, contentType) => {
  const res = await r2().send(
    new CreateMultipartUploadCommand({ Bucket: BUCKET, Key: key, ContentType: contentType || undefined })
  );
  return res.UploadId;
};

export const presignPart = (key, uploadId, partNumber) =>
  getSignedUrl(
    r2(),
    new UploadPartCommand({ Bucket: BUCKET, Key: key, UploadId: uploadId, PartNumber: partNumber }),
    { expiresIn: URL_TTL }
  );

export const completeMultipart = (key, uploadId, parts) =>
  r2().send(
    new CompleteMultipartUploadCommand({
      Bucket: BUCKET,
      Key: key,
      UploadId: uploadId,
      MultipartUpload: {
        Parts: parts
          .map(p => ({ ETag: p.etag, PartNumber: p.partNumber }))
          .sort((a, b) => a.PartNumber - b.PartNumber),
      },
    })
  );

export const abortMultipart = (key, uploadId) =>
  r2().send(new AbortMultipartUploadCommand({ Bucket: BUCKET, Key: key, UploadId: uploadId }));

// Deletes an R2 object (deleting a key that does not exist is a no-op).
export async function deleteObject(key) {
  if (!key) return;
  await r2().send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}

// Lists every object under a prefix (follows pagination, no 50-item cap).
export async function listObjects(prefix) {
  const out = [];
  let token;
  do {
    const res = await r2().send(
      new ListObjectsV2Command({ Bucket: BUCKET, Prefix: prefix, ContinuationToken: token })
    );
    for (const o of res.Contents || []) {
      if (o.Key.endsWith("/")) continue;
      out.push({ key: o.Key, size: o.Size, lastModified: o.LastModified });
    }
    token = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (token);
  return out.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));
}
