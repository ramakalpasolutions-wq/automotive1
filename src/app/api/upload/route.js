import { requireStaff } from "@/lib/staffAuth";
import { NextResponse } from "next/server";
import {
  makeKey,
  publicUrl,
  presignPut,
  createMultipart,
  presignPart,
  completeMultipart,
  abortMultipart,
} from "@/lib/r2";

// Hands out presigned Cloudflare R2 URLs. The browser uploads the file bytes
// directly to R2, so there is no server-side file size limit.
//
// POST { action: "single",   folder, filename, contentType }            -> { key, url, uploadUrl }
// POST { action: "create",   folder, filename, contentType }            -> { key, url, uploadId }
// POST { action: "part",     key, uploadId, partNumber }                -> { uploadUrl }
// POST { action: "complete", key, uploadId, parts: [{partNumber,etag}]} -> { key, url }
// POST { action: "abort",    key, uploadId }                            -> { success }
export async function POST(req) {
  const denied = requireStaff(req); // admin only
  if (denied) return denied;
  try {
    const body = await req.json();
    const { action } = body;

    if (action === "single" || action === "create") {
      if (!body.filename) return bad("filename is required");
      const key = makeKey(body.folder, body.filename);
      const url = publicUrl(key);
      if (action === "single") {
        return NextResponse.json({ key, url, uploadUrl: await presignPut(key, body.contentType) });
      }
      return NextResponse.json({ key, url, uploadId: await createMultipart(key, body.contentType) });
    }

    if (!body.key || !body.uploadId) return bad("key and uploadId are required");

    if (action === "part") {
      const n = Number(body.partNumber);
      if (!Number.isInteger(n) || n < 1 || n > 10000) return bad("invalid partNumber");
      return NextResponse.json({ uploadUrl: await presignPart(body.key, body.uploadId, n) });
    }

    if (action === "complete") {
      if (!Array.isArray(body.parts) || !body.parts.length) return bad("parts are required");
      await completeMultipart(body.key, body.uploadId, body.parts);
      return NextResponse.json({ key: body.key, url: publicUrl(body.key) });
    }

    if (action === "abort") {
      await abortMultipart(body.key, body.uploadId);
      return NextResponse.json({ success: true });
    }

    return bad("unknown action");
  } catch (err) {
    console.error("R2 upload error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

const bad = msg => NextResponse.json({ error: msg }, { status: 400 });
