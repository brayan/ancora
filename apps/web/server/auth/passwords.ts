import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const passwordPrefix = "scrypt:v1";
const saltBytes = 16;
const keyLength = 64;

export const minimumPasswordLength = 12;

export async function hashPassword(password: string) {
  const salt = randomBytes(saltBytes).toString("base64url");
  const derivedKey = (await scrypt(password, salt, keyLength)) as Buffer;

  return `${passwordPrefix}:${salt}:${derivedKey.toString("base64url")}`;
}

export async function verifyPassword(password: string, storedHash: string) {
  const [algorithm, version, salt, hash] = storedHash.split(":");

  if (`${algorithm}:${version}` !== passwordPrefix || !salt || !hash) {
    return false;
  }

  const storedKey = Buffer.from(hash, "base64url");
  const candidateKey = (await scrypt(password, salt, storedKey.length)) as Buffer;

  return storedKey.length === candidateKey.length && timingSafeEqual(storedKey, candidateKey);
}

export function isPasswordAllowed(password: string) {
  return password.length >= minimumPasswordLength && password.length <= 1024;
}
