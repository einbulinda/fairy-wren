import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Lock } from "lucide-react";
import fwLogo from "/fairy-wren-logo-removebg.png";
import toast from "react-hot-toast";

const LoginPage = () => {
  const [pinInput, setPinInput] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handlePinSubmit = async (e) => {
    e.preventDefault();

    if (pinInput.length < 4) {
      toast.error("PIN must be at least 4 digits");
      return;
    }
    setLoading(true);

    try {
      await login(pinInput);
      toast.success("Login successful");
    } catch (error) {
      toast.error(error.error || "Invalid PIN or unauthorized access");
      setPinInput("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-950 flex items-center justify-center p-4">
      <div className="bg-surface-800 rounded-2xl shadow-2xl p-8 w-full max-w-md border border-surface-700">
        {/* Header */}
        <div className="mb-8 text-center">
          <img
            src={fwLogo}
            alt="Fairy Wren Logo"
            className="w-32 mx-auto mb-4"
          />
          <h1 className="text-2xl font-bold text-white mb-1">
            Fairy Wren ERP
          </h1>
          <p className="text-sm text-surface-400">
            Management Portal
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handlePinSubmit} className="space-y-5">
          <div className="relative">
            <Lock
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400"
            />
            <input
              type="password"
              maxLength="8"
              pattern="[0-9]*"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              placeholder="Enter PIN"
              disabled={loading}
              autoFocus
              className="w-full pl-10 pr-4 py-3 bg-surface-700 border border-surface-600 rounded-lg text-white text-center text-xl tracking-widest focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 disabled:opacity-50 placeholder:text-surface-500 placeholder:text-base placeholder:tracking-normal"
            />
          </div>

          <button
            type="submit"
            disabled={loading || pinInput.length < 4}
            className="w-full py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg
                  className="animate-spin h-5 w-5"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Signing in...
              </span>
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        <p className="mt-6 text-xs text-surface-500 text-center">
          Access restricted to management roles only.
        </p>

        {/* Dev hints */}
        {import.meta.env.DEV && (
          <div className="mt-6 pt-4 border-t border-surface-700">
            <details className="text-xs text-surface-500">
              <summary className="cursor-pointer text-center hover:text-surface-400 transition-colors">
                Demo Access (Development)
              </summary>
              <div className="mt-3 space-y-1.5 bg-surface-700/30 rounded-lg p-3">
                <p className="flex justify-between">
                  <span className="text-surface-400">Owner:</span>
                  <span className="font-mono text-primary-400">0100</span>
                </p>
              </div>
            </details>
          </div>
        )}
      </div>
    </div>
  );
};

export default LoginPage;