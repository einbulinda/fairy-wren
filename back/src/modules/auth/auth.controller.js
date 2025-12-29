const crypto = require("crypto");
const bcrypt = require("bcrypt");
const supabase = require("../../config/supabase");
const { signToken } = require("../../utils/jwt");

exports.login = async (req, res) => {
  try {
    const { pin } = req.body;

    // 1. Validate PIN exists on request body
    if (!pin) {
      return res.status(400).json({ error: "PIN is required" });
    }

    //2. Compute fingerprint
    const fingerprint = crypto
      .createHmac("sha256", process.env.PIN_PEPPER)
      .update(pin)
      .digest("hex");

    //3. Find user with the fingerprint
    const { data: user, error } = await supabase
      .from("profiles")
      .select("id, pin_hash, role, active")
      .eq("pin_fingerprint", fingerprint)
      .eq("active", true)
      .single();

    if (error | !user) {
      return res.status(401).json({ error: "Invalid PIN" });
    }

    //4. Verify Hash
    const valid = await bcrypt.compare(pin, user.pin_hash);

    if (!valid) return res.status(401).json({ error: "Invalid PIN" });

    // Create JWT Token and keep payload small
    const token = signToken({
      id: user.id,
      role: user.role,
      name: user.name,
    });

    res.json({ token, user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
