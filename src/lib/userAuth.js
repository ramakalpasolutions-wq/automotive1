// Customer accounts for the mobile app ("appusers" collection).
// Passwords are stored only as scrypt hashes; the app keeps a signed token.
import { randomBytes, randomInt, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
import { issueToken, readToken } from "./tokens";

const scryptAsync = promisify(scrypt);
const DB = "automotivecarcare";

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const normEmail = e => String(e || "").trim().toLowerCase();
export const sleep = ms => new Promise(r => setTimeout(r, ms));

let indexed = false;
export async function users() {
  const col = (await clientPromise).db(DB).collection("appusers");
  if (!indexed) {
    await col.createIndex({ email: 1 }, { unique: true });
    indexed = true;
  }
  return col;
}

export async function hashSecret(secret) {
  const salt = randomBytes(16);
  const key = await scryptAsync(String(secret), salt, 64);
  return `scrypt$${salt.toString("base64")}$${key.toString("base64")}`;
}

export async function checkSecret(secret, stored) {
  try {
    const [, salt, key] = String(stored).split("$");
    const expected = Buffer.from(key, "base64");
    const actual = await scryptAsync(String(secret), Buffer.from(salt, "base64"), expected.length);
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

export const resetCode = () => String(randomInt(0, 1_000_000)).padStart(6, "0");

// Tokens remember the password version, so changing or resetting the password
// signs out every other device.
export const tokenFor = user => issueToken("user", String(user._id), 60, { v: user.tokenVersion || 0 });

// The signed-in customer for this request, or null.
export async function currentUser(request) {
  const t = readToken(request, "user");
  if (!t || !ObjectId.isValid(t.sub)) return null;
  const user = await (await users()).findOne({ _id: new ObjectId(t.sub) });
  return user && (user.tokenVersion || 0) === (t.v || 0) ? user : null;
}

export const publicUser = u => ({ id: String(u._id), name: u.name, email: u.email, phone: u.phone || "", createdAt: u.createdAt });

export function validatePassword(p) {
  return typeof p === "string" && p.length >= 8 ? null : "Password must be at least 8 characters.";
}
