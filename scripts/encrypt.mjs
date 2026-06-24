import { createCipheriv, randomBytes, createHash } from 'crypto';

const plain = process.argv[2];
if (!plain) {
  console.error('Usage: node scripts/encrypt.mjs <value>');
  process.exit(1);
}

const masterKey = process.env.ENV_MASTER_KEY;
if (!masterKey) {
  console.error('Set ENV_MASTER_KEY environment variable');
  process.exit(1);
}

const key = createHash('sha256').update(masterKey).digest();
const iv = randomBytes(16);
const cipher = createCipheriv('aes-256-gcm', key, iv);

let enc = cipher.update(plain, 'utf-8', 'base64');
enc += cipher.final('base64');
const tag = cipher.getAuthTag();

const result = `${iv.toString('hex')}.${tag.toString('hex')}.${enc}`;
console.log(result);
