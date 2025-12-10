const supabase = require("../../config/supabase");

exports.login = async (req, res) => {
  try {
    const { pin } = req.body;

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("pin", pin)
      .eq("active", true)
      .single();

    if (error | !data) {
      return res.status(401).json({ error: "Invalid PIN" });
    }

    res.json({ user: data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
