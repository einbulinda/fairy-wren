const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

/**
 * KCB signs every IPN body with SHA256withRSA and sends the base64 signature
 * in the `Signature` HTTP header. We verify it with the public key KCB issues.
 *
 * Key config:
 *   KCB_IPN_PUBLIC_KEY_PATH  path to KCB's PEM file (public key or certificate).
 *                            Absolute in production (/etc/fairywren/...), outside
 *                            the deploy folder that rsync --delete wipes; a
 *                            relative path is taken from the api/ folder.
 *
 * KCB_IPN_VERIFY_SIGNATURE=false disables verification for local development
 * only; it is ignored when NODE_ENV=production.
 */

let cachedKey = null;
let cachedFrom = null;

function loadPublicKey() {
  const keyPath = process.env.KCB_IPN_PUBLIC_KEY_PATH;
  if (!keyPath) return null;
  if (cachedKey && cachedFrom === keyPath) return cachedKey;

  const pem = fs.readFileSync(path.resolve(__dirname, "../../..", keyPath), "utf8");
  cachedKey = crypto.createPublicKey(pem);
  cachedFrom = keyPath;
  return cachedKey;
}

function isVerificationEnabled() {
  if (process.env.NODE_ENV === "production") return true;
  return process.env.KCB_IPN_VERIFY_SIGNATURE !== "false";
}

function verifyBytes(data, signatureB64, key) {
  try {
    return crypto.verify("sha256", data, key, Buffer.from(signatureB64, "base64"));
  } catch {
    return false;
  }
}

/**
 * Verify a KCB signature.
 *
 * The spec does not state whether KCB signs the exact bytes sent or a
 * re-serialised form, so we try the raw body first and fall back to
 * JSON.stringify(parsedBody). Either way the signature proves KCB signed this
 * content. `matchedOn` is logged so UAT tells us which form KCB uses.
 *
 * @returns {{ valid: boolean, matchedOn?: "raw"|"json", reason?: string }}
 */
function verifySignature({ rawBody, body, signature }) {
  if (!isVerificationEnabled()) {
    return { valid: true, matchedOn: "disabled" };
  }

  if (!signature) return { valid: false, reason: "MISSING_SIGNATURE" };

  let key;
  try {
    key = loadPublicKey();
  } catch (err) {
    return { valid: false, reason: `PUBLIC_KEY_UNREADABLE: ${err.message}` };
  }
  if (!key) return { valid: false, reason: "PUBLIC_KEY_NOT_CONFIGURED" };

  const sig = String(signature).trim();

  if (rawBody && verifyBytes(rawBody, sig, key)) {
    return { valid: true, matchedOn: "raw" };
  }
  if (body && verifyBytes(Buffer.from(JSON.stringify(body)), sig, key)) {
    return { valid: true, matchedOn: "json" };
  }
  return { valid: false, reason: "SIGNATURE_MISMATCH" };
}

/** Test hook: forget the cached key (env changed). */
function _resetKeyCache() {
  cachedKey = null;
  cachedFrom = null;
}

module.exports = { verifySignature, isVerificationEnabled, _resetKeyCache };
