/**
 * KCB Buni authorisation check — no M-Pesa prompt is sent.
 *
 *   cd /var/www/fairywren-api && node scripts/kcb-auth-check.js
 *
 * 1. Gets a token with KCB_CONSUMER_KEY / KCB_CONSUMER_SECRET from
 *    <KCB_BUNI_BASE_URL>/token and prints what it is (never the token itself).
 * 2. Calls the STK push address with an EMPTY body. If the token is accepted
 *    KCB answers with a validation error (400/422/200 with an error code);
 *    if the token is not accepted for STK, it answers 401 again.
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const base = (process.env.KCB_BUNI_BASE_URL || "").trim().replace(/\/+$/, "");
const key = process.env.KCB_CONSUMER_KEY;
const secret = process.env.KCB_CONSUMER_SECRET;

const mask = (s) => (s ? `${s.slice(0, 4)}…${s.slice(-4)} (${s.length} chars)` : "(not set)");

function jwtPayload(token) {
  const parts = String(token).split(".");
  if (parts.length !== 3) return null; // opaque token
  try {
    return JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

async function call(url, init) {
  const res = await fetch(url, { ...init, signal: AbortSignal.timeout(15000) });
  const text = await res.text();
  let body;
  try { body = JSON.parse(text); } catch { body = text.slice(0, 500); }
  return { status: res.status, body };
}

(async () => {
  console.log("Base URL       :", base || "(not set)");
  console.log("Consumer key   :", mask(key));
  console.log("Consumer secret:", mask(secret));
  if (!base || !key || !secret) process.exit(1);

  // 1. Token
  const tokenUrl = `${base}/token?grant_type=client_credentials`;
  const t = await call(tokenUrl, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${key}:${secret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });
  console.log("\nToken          :", tokenUrl, "→ HTTP", t.status);
  if (t.status !== 200 || !t.body?.access_token) {
    console.log(t.body);
    process.exit(1);
  }
  const { access_token: token, ...meta } = t.body;
  console.log("Token reply    :", meta); // scope, token_type, expires_in
  const claims = jwtPayload(token);
  if (claims) {
    const { keytype, aut, azp, aud, iss, scope, application, subscribedAPIs, exp } = claims;
    console.log("Token claims   :", { keytype, aut, azp, aud, iss, scope, application, subscribedAPIs, exp });
  } else {
    console.log("Token claims   : opaque token (not a JWT)");
  }

  // 2. STK address with an empty body — no prompt can be sent
  const stkUrl = `${base}/mm/api/request/1.0.0/stkpush`;
  const s = await call(stkUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      routeCode: "207",
      operation: "STKPush",
      messageId: `authcheck-${Date.now()}`,
    },
    body: "{}",
  });
  console.log("\nSTK (empty body):", stkUrl, "→ HTTP", s.status);
  console.log(JSON.stringify(s.body, null, 2));
  console.log(
    s.status === 401 || s.status === 403
      ? "\n→ KCB does not accept this token for STK push (subscription / key type / approval on the Buni portal)."
      : "\n→ The token IS accepted for STK push; the earlier 401 came from something else.",
  );
})().catch((err) => {
  console.error("Check failed:", err.message);
  process.exit(1);
});
