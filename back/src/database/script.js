require("dotenv").config();

const bcrypt = require("bcrypt");
const crypto = require("crypto");

(async () => {
  const pin = "9999";
  const pinHash = await bcrypt.hash(pin, 10);

  const fingerprint = crypto
    .createHmac("sha256", process.env.PIN_PEPPER)
    .update(pin)
    .digest("hex");

  console.log({ pinHash, fingerprint });
})();
