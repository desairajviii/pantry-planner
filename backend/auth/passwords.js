import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt);
const KEY_LENGTH = 64;

// Stored as "salt:hash". A new random salt for every password means two
// users with the same password still get different hashes.
export async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const key = await scryptAsync(password, salt, KEY_LENGTH);
  return `${salt}:${key.toString("hex")}`;
}

export async function verifyPassword(password, stored) {
  const [salt, keyHex] = (stored ?? "").split(":");
  if (!salt || !keyHex) {
    return false;
  }
  const key = await scryptAsync(password, salt, KEY_LENGTH);
  const storedKey = Buffer.from(keyHex, "hex");
  // timingSafeEqual takes the same time whether the first or last byte
  // differs, so response times don't hint at how close a guess was
  return storedKey.length === key.length && timingSafeEqual(storedKey, key);
}
