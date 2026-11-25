#!/usr/bin/env node
/**
 * Simulate KCB till Instant Payment Notifications against a local API.
 *
 * 1. Generate a dev key pair (once):
 *      node scripts/simulate-kcb-ipn.js --gen-keys
 *    → keys/dev_kcb_private.pem, keys/dev_kcb_public.pem (git-ignored)
 *
 * 2. Point the API at the dev public key in api/.env and restart it:
 *      KCB_IPN_PUBLIC_KEY_PATH=./keys/dev_kcb_public.pem
 *    (Replace with KCB's real public key when the bank issues it.)
 *
 * 3. Send a signed notification:
 *      node scripts/simulate-kcb-ipn.js --amount 1500 --name "PETER BOR" --ref "TABLE 4"
 *
 * Options:
 *   --url <url>        default http://localhost:8000/integrations/kcb/ipn/till
 *   --amount <n>       default 1000
 *   --name "<first> [middle] [last]"   default "TEST CUSTOMER"
 *   --phone <msisdn>   default 254711000000
 *   --ref <text>       what the customer typed as account no. (default "")
 *   --txn <id>         KCB transaction id (default random); reuse to test retries
 *   --bad-signature    sign with a throwaway key (expect 401)
 */
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const KEY_DIR = path.join(__dirname, "..", "keys");
const PRIVATE_KEY = path.join(KEY_DIR, "dev_kcb_private.pem");
const PUBLIC_KEY = path.join(KEY_DIR, "dev_kcb_public.pem");

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 && process.argv[i + 1] !== undefined ? process.argv[i + 1] : fallback;
}
const flag = (name) => process.argv.includes(`--${name}`);

function genKeys() {
  fs.mkdirSync(KEY_DIR, { recursive: true });
  const { privateKey, publicKey } = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
  fs.writeFileSync(PRIVATE_KEY, privateKey.export({ type: "pkcs8", format: "pem" }));
  fs.writeFileSync(PUBLIC_KEY, publicKey.export({ type: "spki", format: "pem" }));
  console.log(`Wrote ${PRIVATE_KEY}\nWrote ${PUBLIC_KEY}`);
  console.log("Set in api/.env:  KCB_IPN_PUBLIC_KEY_PATH=./keys/dev_kcb_public.pem");
}

function eatTimestamp(d = new Date()) {
  const eat = new Date(d.getTime() + 3 * 3600 * 1000).toISOString(); // UTC+3
  return eat.slice(0, 19).replace(/[-T:]/g, "");
}

async function send() {
  if (!fs.existsSync(PRIVATE_KEY)) {
    console.error("No dev key found. Run with --gen-keys first.");
    process.exit(1);
  }

  const url = arg("url", "http://localhost:8000/integrations/kcb/ipn/till");
  const [firstName = "", middleName = "", ...rest] = arg("name", "TEST CUSTOMER").split(/\s+/);
  const txnId = arg("txn", `FT${Date.now().toString(36).toUpperCase()}`);

  const payload = {
    header: {
      messageID: crypto.randomUUID(),
      originatorConversationID: "",
      channelCode: "202",
      timeStamp: eatTimestamp(),
    },
    requestPayload: {
      primaryData: { businessKey: "000000", businessKeyType: "notifyBiller" },
      additionalData: {
        notificationData: {
          businessKey: arg("ref", ""),
          businessKeyType: "BillReferenceNumber",
          debitMSISDN: arg("phone", "254711000000"),
          transactionAmt: String(arg("amount", "1000")),
          transactionDate: new Date().toString(),
          transactionID: txnId,
          firstName,
          middleName: rest.length ? middleName : "",
          lastName: rest.length ? rest.join(" ") : middleName,
          currency: "KES",
          narration: "",
          transactionType: "MPESA",
          balance: "0",
        },
      },
    },
  };

  const body = JSON.stringify(payload);
  const key = flag("bad-signature")
    ? crypto.generateKeyPairSync("rsa", { modulusLength: 2048 }).privateKey
    : fs.readFileSync(PRIVATE_KEY, "utf8");
  const signature = crypto.sign("sha256", Buffer.from(body), key).toString("base64");

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Signature: signature },
    body,
  });

  console.log(`→ ${txnId}  KES ${payload.requestPayload.additionalData.notificationData.transactionAmt}`);
  console.log(`← HTTP ${res.status}`);
  console.log(JSON.stringify(await res.json().catch(() => null), null, 2));
}

if (flag("gen-keys")) genKeys();
else send().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
