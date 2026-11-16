import { NextResponse } from "next/server";
import { listObjects, publicUrl, HERO_PREFIX } from "@/lib/r2";

export const dynamic = "force-dynamic";

// Lists homepage hero images stored in Cloudflare R2.
// Keeps the old response shape (public_id / secure_url / bytes) so the
// slider and dashboard work unchanged.
export async function GET() {
  try {
    const objects = await listObjects(HERO_PREFIX);
    const images = objects.map(o => ({
      public_id: o.key,
      secure_url: publicUrl(o.key),
      bytes: o.size,
      created_at: o.lastModified,
    }));
    return NextResponse.json({ images, count: images.length, success: true });
  } catch (error) {
    console.error("Error listing hero images:", error);
    return NextResponse.json({ images: [], error: error.message });
  }
}
