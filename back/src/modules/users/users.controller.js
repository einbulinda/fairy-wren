const supabase = require("../../config/supabase");
const bcrypt = require("bcrypt");
const crypto = require("crypto");

// Get all users
exports.getUsers = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("name");

    if (error) throw error;

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get User By ID
exports.getUserById = async (req, res) => {
  try {
    const { userId } = req.params;

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    if (error) throw error;

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Create user
exports.createUser = async (req, res) => {
  try {
    const { name, pin, role } = req.body;

    const pinHash = await bcrypt.hash(pin, 10);

    const fingerprint = crypto
      .createHmac("sha256", process.env.PIN_PEPPER)
      .update(pin)
      .digest("hex");

    const { data, error } = await supabase
      .from("profiles")
      .insert({
        name,
        pin_hash: pinHash,
        pin_fingerprint: fingerprint,
        role,
        active: true,
      })
      .select()
      .single();

    if (error) throw error;

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update user
exports.updateUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const updates = req.body;

    const { data, error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", userId)
      .select()
      .single();

    if (error) throw error;

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Deactivate a User
exports.deactivateUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { status } = req.body;

    const { data, error } = await supabase
      .from("profiles")
      .update({ active: status })
      .eq("id", userId)
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
