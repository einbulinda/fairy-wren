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
    <div className="min-h-screen bg-linear-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-2xl shadow-2xl p-8 w-full max-w-md border-2 border-pink-500">
        <div className="mb-8">
          <a href="/" target="_self">
            <img src={fwLogo} className="" alt="Fairy Wren Logo" />
          </a>
          <p className="text-gray-400 text-center">Welcome to Utawala</p>
        </div>

        <form onSubmit={handlePinSubmit} className="space-y-4">
          <input
            type="password"
            maxLength="6"
            value={pinInput}
            onChange={(e) => setPinInput(e.target.value)}
            placeholder="Enter PIN"
            disabled={loading}
            autoFocus
            className="w-full px-4 py-3 bg-gray-700 border-2 border-purple-500 rounded-lg text-white text-center text-2xl tracking-widest focus:outline-none focus:border-pink-500 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-linear-to-r from-pink-500 to-purple-500 text-white rounded-lg font-semibold hover:from-pink-600 hover:to-purple-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Loading in..." : "Login"}
          </button>
        </form>

        {/* To Delete on deployment to Production */}
        <div className="mt-6 text-xs text-gray-500 text-center">
          <p>
            Demo PINs: Waitress (1234), Bartender (5678), Manager (9999), Owner
            (0000)
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
