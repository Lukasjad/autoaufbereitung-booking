import { createDecipheriv, createHash } from 'crypto';

const encVal = process.argv[2];
if (!encVal) {
  console.error('Usage: node scripts/decrypt.mjs <encrypted_value>');
  process.exit(1);
}

const masterKey = process.env.ENV_MASTER_KEY;
if (!masterKey) {
  console.error('Set ENV_MASTER_KEY environment variable');
  process.exit(1);
}

const [ivHex, tagHex, enc] = encVal.split('.');
const key = createHash('sha256').update(masterKey).digest();
const iv = Buffer.from(ivHex, 'hex');
const tag = Buffer.from(tagHex, 'hex');
const decipher = createDecipheriv('aes-256-gcm', key, iv);
decipher.setAuthTag(tag);

let plain = decipher.update(enc, 'base64', 'utf-8');
plain += decipher.final('utf-8');
console.log(plain);
