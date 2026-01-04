import React, { useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import fwLogo from "/fairy-wren-logo-removebg.png";
import toast from "react-hot-toast";

const LoginScreen = () => {
  const [pinInput, setPinInput] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handlePinSubmit = async (e) => {
    e.preventDefault();

    if (pinInput.length < 4) {
      TransformStream.error("PIN must be at least 4 digits");
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
    <div className="min-h-screen bg-linear-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center p-4 sm:p-6 lg:p-8">
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
            {/* {new Date().toLocaleDateString()} */}Hasher's Club
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handlePinSubmit} className="space-y-4 sm:space-y-5">
          <input
            type="password"
            maxLength="8"
            pattern="[0-9]*"
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
            className="w-full sm:py-4 py-3 bg-linear-to-r from-pink-500 to-purple-500 text-white rounded-lg 
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
        {/* <div className="mt-6 sm:mt-8 pt-6 border-t border-gray-700">
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
              <p className="flex justify-between">
                <span className="text-gray-400">Owner:</span>
                <span className="font-mono text-yellow-400">0000</span>
              </p>
            </div>
          </details>
        </div> */}

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
