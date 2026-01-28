import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96 bits per NIST recommendation
const AUTH_TAG_LENGTH = 16;

const getKey = () => {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error("ENCRYPTION_KEY environment variable is required");
  }
  return Buffer.from(key, "hex");
};

export function encrypt(plaintext: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);

  let encrypted = cipher.update(plaintext, "utf8", "base64");
  encrypted += cipher.final("base64");

  const authTag = cipher.getAuthTag();

  // Combine IV + authTag + ciphertext for storage
  return Buffer.concat([iv, authTag, Buffer.from(encrypted, "base64")]).toString(
    "base64"
  );
}

export function decrypt(encryptedData: string): string {
  const data = Buffer.from(encryptedData, "base64");

  const iv = data.subarray(0, IV_LENGTH);
  const authTag = data.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = data.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertext.toString("base64"), "base64", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}
