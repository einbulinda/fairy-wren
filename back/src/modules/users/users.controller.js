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
    // 1. Basic validation
    if (!name || !pin || !role) {
      return res.status(400).json({
        error: "Name, PIN, and role are required",
      });
    }
    // 2. Compute fingerprint (deterministic)
    const fingerprint = crypto
      .createHmac("sha256", process.env.PIN_PEPPER)
      .update(pin)
      .digest("hex");

    // 3. Optional pre-check (UX improvement)
    const { data: existingUser } = await supabase
      .from("profiles")
      .select("id")
      .eq("pin_fingerprint", fingerprint)
      .maybeSingle();

    if (existingUser) {
      return res.status(409).json({
        error: "PIN already in use. Please choose a different PIN.",
      });
    }

    // 4. Hash PIN (non-deterministic)
    const pinHash = await bcrypt.hash(pin, 10);

    // 5. Insert user
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

    if (error) {
      // 6. Handle unique constraint race-condition safely
      if (error.code === "23505") {
        return res.status(409).json({
          error: "PIN already in use. Please choose a different PIN.",
        });
      }

      throw error;
    }

    res.status(201).json(data);
  } catch (err) {
    console.error("Create user error:", err);
    res.status(500).json({
      error: "Failed to create user",
    });
  }
};

// Update user
exports.updateUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const updates = req.body;

    console.log(updates);

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
