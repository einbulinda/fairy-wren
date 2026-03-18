/**
 * Environment Configuration Validator
 * Ensures all required environment variables are set before server starts
 */

const REQUIRED_ENV_VARS = [
  { name: "SUPABASE_URL", description: "Supabase project URL" },
  { name: "SUPABASE_KEY", description: "Supabase service role key" },
  { name: "JWT_SECRET", description: "Secret for JWT token signing" },
  { name: "PIN_PEPPER", description: "Pepper for PIN hashing" },
];

const OPTIONAL_ENV_VARS = [
  { name: "NODE_ENV", default: "development", description: "Environment mode" },
  { name: "PORT", default: "8000", description: "Server port" },
];

/**
 * Validate all required environment variables
 * @throws {Error} If any required variable is missing
 */
function validateEnv() {
  const missing = [];
  const warnings = [];

  // Check required variables
  for (const { name, description } of REQUIRED_ENV_VARS) {
    if (!process.env[name]) {
      missing.push({ name, description });
    }
  }

  // Set defaults for optional variables
  for (const { name, default: defaultValue, description } of OPTIONAL_ENV_VARS) {
    if (!process.env[name]) {
      process.env[name] = defaultValue;
      warnings.push(`⚠️  ${name} not set, using default: ${defaultValue} (${description})`);
    }
  }

  // If any required variables are missing, throw error
  if (missing.length > 0) {
    console.error("\n❌ Missing required environment variables:\n");
    missing.forEach(({ name, description }) => {
      console.error(`   ${name}: ${description}`);
    });
    console.error("\nPlease set these variables in your .env file or environment.\n");
    throw new Error(`Missing ${missing.length} required environment variable(s)`);
  }

  // Print warnings
  if (warnings.length > 0) {
    console.log("\n" + warnings.join("\n") + "\n");
  }

  // Print success
  console.log("✅ Environment variables validated\n");

  // Security warnings for production
  if (process.env.NODE_ENV === "production") {
    const securityChecks = [
      { name: "JWT_SECRET", minLength: 32, message: "JWT_SECRET should be at least 32 characters in production" },
      { name: "PIN_PEPPER", minLength: 16, message: "PIN_PEPPER should be at least 16 characters in production" },
    ];

    for (const { name, minLength, message } of securityChecks) {
      if (process.env[name] && process.env[name].length < minLength) {
        console.warn(`⚠️  Security Warning: ${message}`);
      }
    }
  }
}

module.exports = { validateEnv };
