const { createClient } = require("@supabase/supabase-js");

let client = null;

module.exports = () => {
  if (client) return client;

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
    throw new Error("Supabase environment variables are missing");
  }

  // Initialize Supabase
  client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

  return client;
};
