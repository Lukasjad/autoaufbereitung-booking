import { createDecipheriv, createHash } from "crypto";

let cachedKey: Buffer | null = null;

function getKey(): Buffer {
  if (!cachedKey) {
    const masterKey = process.env.ENV_MASTER_KEY;
    if (!masterKey) throw new Error("ENV_MASTER_KEY not set");
    cachedKey = createHash("sha256").update(masterKey).digest();
  }
  return cachedKey;
}

function tryDecrypt(encVal: string): string {
  const [ivHex, tagHex, enc] = encVal.split(".");
  const key = getKey();
  const iv = Buffer.from(ivHex, "hex");
  const tag = Buffer.from(tagHex, "hex");
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  let plain = decipher.update(enc, "base64", "utf-8");
  plain += decipher.final("utf-8");
  return plain;
}

export function env(name: string): string {
  const encName = `ENC_${name}`;
  const encVal = process.env[encName];
  if (encVal) return tryDecrypt(encVal);
  return process.env[name] ?? "";
}
