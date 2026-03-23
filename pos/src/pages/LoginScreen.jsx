import React, { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import fwLogo from "/fairy-wren-logo-removebg.png";
import toast from "react-hot-toast";

const UI_VERSION_KEY = "pos_ui_version";

const LoginScreen = () => {
  const [pinInput, setPinInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [uiVersion, setUiVersion] = useState("classic");
  const [showVersionSelector, setShowVersionSelector] = useState(false);
  const { login } = useAuth();

  // Load saved UI version preference
  useEffect(() => {
    const savedVersion = localStorage.getItem(UI_VERSION_KEY);
    if (savedVersion) {
      setUiVersion(savedVersion);
    }
  }, []);

  const handleUiVersionChange = (version) => {
    setUiVersion(version);
    localStorage.setItem(UI_VERSION_KEY, version);
  };

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
      toast.error("Invalid PIN or Inactive User");
      setPinInput("");
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      {/* Background decorative elements */}

      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-32 h-32 sm:w-48 sm:h-48 bg-yellow-400/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-40 h-40 sm:w-56 sm:h-56 bg-purple-500/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative bg-gray-800/95 backdrop-blur-sm rounded-2xl shadow-2xl p-6 w-full max-w-md border-2 border-yellow-400 sm:p-8 lg:p-10">
        {/* Logo and Header */}
        <div className="mb-6 sm:mb-8">
          <a href="/" target="_self" className="block">
            <img
              src={fwLogo}
              className="w-32 sm:w-40 lg:w-48 mx-auto mb-4"
              alt="Fairy Wren Logo"
            />
          </a>
          <p className="text-2xl sm:text-3xl lg:text-4xl font-bold text-yellow-400 text-center mb-2 tracking-wide">
            Hasher's Club
          </p>
          <p className="text-sm text-gray-400 text-center">
            Nightclub Point of Sale
          </p>
        </div>

        {/* UI Version Selector Toggle */}
        <div className="mb-4 flex justify-center">
          <button
            onClick={() => setShowVersionSelector(!showVersionSelector)}
            className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors"
          >
            <span>Interface Version</span>
            <svg
              className={`w-4 h-4 transition-transform ${showVersionSelector ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        {/* UI Version Selection Cards */}
        {showVersionSelector && (
          <div className="mb-6 grid grid-cols-2 gap-3">
            <button
              onClick={() => handleUiVersionChange("classic")}
              className={`p-3 rounded-xl border-2 transition-all text-left ${
                uiVersion === "classic"
                  ? "border-yellow-400 bg-yellow-400/10"
                  : "border-gray-600 hover:border-gray-500"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <div className={`w-3 h-3 rounded-full ${uiVersion === "classic" ? "bg-yellow-400" : "bg-gray-500"}`} />
                <span className={`text-sm font-semibold ${uiVersion === "classic" ? "text-yellow-400" : "text-gray-300"}`}>
                  Classic
                </span>
              </div>
              <p className="text-xs text-gray-400">Original interface</p>
            </button>

            <button
              onClick={() => handleUiVersionChange("beta")}
              className={`p-3 rounded-xl border-2 transition-all text-left relative ${
                uiVersion === "beta"
                  ? "border-pink-500 bg-pink-500/10"
                  : "border-gray-600 hover:border-gray-500"
              }`}
            >
              <div className="absolute -top-2 -right-2 bg-pink-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                NEW
              </div>
              <div className="flex items-center gap-2 mb-1">
                <div className={`w-3 h-3 rounded-full ${uiVersion === "beta" ? "bg-pink-500" : "bg-gray-500"}`} />
                <span className={`text-sm font-semibold ${uiVersion === "beta" ? "text-pink-400" : "text-gray-300"}`}>
                  Beta
                </span>
              </div>
              <p className="text-xs text-gray-400">Nightclub optimized</p>
            </button>
          </div>
        )}

        {/* Selected Version Indicator */}
        {!showVersionSelector && (
          <div className="mb-6 text-center">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs bg-gray-700/50 text-gray-300">
              Using: 
              <span className={uiVersion === "beta" ? "text-pink-400 font-semibold" : "text-yellow-400 font-semibold"}>
                {uiVersion === "beta" ? "Beta (Nightclub)" : "Classic"}
              </span>
              {uiVersion === "beta" && (
                <span className="bg-pink-500/20 text-pink-400 px-1.5 py-0.5 rounded text-[10px]">NEW</span>
              )}
            </span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handlePinSubmit} className="space-y-4 sm:space-y-5">
          <input
            type="password"
            maxLength="8"
            pattern="[0-9]*"
            inputMode="numeric"
            value={pinInput}
            onChange={(e) => setPinInput(e.target.value)}
            placeholder="Enter PIN"
            disabled={loading}
            autoFocus
            className="sm:py-4 sm:text-2xl w-full px-4 py-3 bg-gray-700 border-2 border-purple-500 rounded-lg text-white text-center text-2xl tracking-widest focus:outline-none focus:border-pink-500 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={loading || pinInput.length < 4}
            className="w-full sm:py-4 py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-lg 
            font-semibold text-base sm:text-lg hover:from-pink-600 hover:to-purple-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed 
            transform hover:scale-105 active:scale-95 shadow-lg hover:shadow-yellow-400/50"
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
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Logging in...
              </span>
            ) : (
              "Login"
            )}
          </button>
        </form>

        {/* Demo PINs - Development Only */}
        {import.meta.env.DEV && (
          <div className="mt-6 sm:mt-8 pt-6 border-t border-gray-700">
            <details className="text-xs sm:text-sm text-gray-500">
              <summary className="cursor-pointer text-center hover:text-gray-400 transition-colors">
                Demo Access (Development)
              </summary>
              <div className="mt-3 space-y-1.5 bg-gray-700/30 rounded-lg p-3 sm:p-4">
                <p className="flex justify-between">
                  <span className="text-gray-400">Waitress:</span>
                  <span className="font-mono text-yellow-400">1234</span>
                </p>
                <p className="flex justify-between">
                  <span className="text-gray-400">Bartender:</span>
                  <span className="font-mono text-yellow-400">5678</span>
                </p>
                <p className="flex justify-between">
                  <span className="text-gray-400">Manager:</span>
                  <span className="font-mono text-yellow-400">9999</span>
                </p>
              </div>
            </details>
          </div>
        )}

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            © 2025 Fairy Wren Ltd. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
