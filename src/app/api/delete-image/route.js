import { NextResponse } from "next/server";
import { deleteObject } from "@/lib/r2";

// POST { key } -> deletes that object from Cloudflare R2
export async function POST(request) {
  try {
    const { key, publicId } = await request.json();
    const target = key || publicId;
    if (!target) {
      return NextResponse.json({ error: "Missing key" }, { status: 400 });
    }
    await deleteObject(target);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting image:", error);
    return NextResponse.json(
      { error: "Failed to delete image: " + error.message },
      { status: 500 }
    );
  }
}
