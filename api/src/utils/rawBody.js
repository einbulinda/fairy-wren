/**
 * `verify` hook for express.json(): keeps the exact request bytes on
 * req.rawBody for routes that verify a signature over the body (KCB IPN).
 * Only kept for those paths; express.json() discards the bytes otherwise.
 */
const RAW_BODY_PREFIXES = ["/integrations/kcb/"];

function saveRawBody(req, _res, buf) {
  if (RAW_BODY_PREFIXES.some((p) => req.originalUrl.startsWith(p))) {
    req.rawBody = Buffer.from(buf);
  }
}

module.exports = { saveRawBody };
