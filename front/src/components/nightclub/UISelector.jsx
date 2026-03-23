import React from "react";
import { LayoutGrid, Sparkles, Moon, Sun } from "lucide-react";
import fwLogo from "/fairy-wren-logo-removebg.png";

const UISelector = ({ onSelect, user }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-950 to-gray-900 flex items-center justify-center p-4">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-10 left-10 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-10 right-10 w-72 h-72 bg-pink-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-yellow-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <img
            src={fwLogo}
            alt="Fairy Wren Logo"
            className="w-24 h-24 mx-auto mb-4 drop-shadow-2xl"
          />
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            Welcome back, <span className="text-yellow-400">{user?.name}</span>
          </h1>
          <p className="text-gray-400">Choose your interface mode</p>
        </div>

        {/* Selection Cards */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Classic UI Card */}
          <button
            onClick={() => onSelect("classic")}
            className="group relative bg-gray-800/80 backdrop-blur-xl rounded-2xl p-8 border-2 border-gray-700 hover:border-blue-500 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/20 text-left"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
            
            <div className="relative">
              <div className="w-16 h-16 bg-blue-500/20 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Sun className="w-8 h-8 text-blue-400" />
              </div>
              
              <h2 className="text-2xl font-bold text-white mb-2 group-hover:text-blue-400 transition-colors">
                Classic Mode
              </h2>
              <p className="text-gray-400 mb-4">
                Traditional POS interface with comprehensive features for detailed order management
              </p>
              
              <ul className="space-y-2 text-sm text-gray-500">
                <li className="flex items-center gap-2">
                  <LayoutGrid className="w-4 h-4 text-blue-400" />
                  Full feature dashboard
                </li>
                <li className="flex items-center gap-2">
                  <LayoutGrid className="w-4 h-4 text-blue-400" />
                  Detailed reporting views
                </li>
                <li className="flex items-center gap-2">
                  <LayoutGrid className="w-4 h-4 text-blue-400" />
                  Best for daytime operations
                </li>
              </ul>
            </div>
          </button>

          {/* Night Club UI Card */}
          <button
            onClick={() => onSelect("nightclub")}
            className="group relative bg-gradient-to-br from-purple-900/80 to-pink-900/80 backdrop-blur-xl rounded-2xl p-8 border-2 border-purple-500/30 hover:border-pink-500 transition-all duration-300 hover:shadow-2xl hover:shadow-pink-500/30 text-left overflow-hidden"
          >
            {/* Glow Effect */}
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-pink-500/30 rounded-full blur-3xl group-hover:bg-pink-500/50 transition-all" />
            <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-purple-500/30 rounded-full blur-3xl group-hover:bg-purple-500/50 transition-all" />
            
            {/* Popular Badge */}
            <div className="absolute top-4 right-4">
              <span className="px-3 py-1 bg-gradient-to-r from-pink-500 to-purple-500 text-white text-xs font-bold rounded-full flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                POPULAR
              </span>
            </div>
            
            <div className="relative">
              <div className="w-16 h-16 bg-gradient-to-br from-pink-500/30 to-purple-500/30 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Moon className="w-8 h-8 text-pink-400" />
              </div>
              
              <h2 className="text-2xl font-bold text-white mb-2 group-hover:text-pink-400 transition-colors">
                Night Club Mode
              </h2>
              <p className="text-gray-300 mb-4">
                High-speed interface optimized for busy nightlife with quick actions and dark theme
              </p>
              
              <ul className="space-y-2 text-sm text-gray-400">
                <li className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-pink-400" />
                  One-tap quick orders
                </li>
                <li className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-pink-400" />
                  Fast customer switching
                </li>
                <li className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-pink-400" />
                  Optimized for dark venues
                </li>
                <li className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-pink-400" />
                  High contrast visibility
                </li>
              </ul>
            </div>
          </button>
        </div>

        {/* Remember Choice Checkbox */}
        <div className="mt-8 text-center">
          <label className="inline-flex items-center gap-2 text-gray-400 cursor-pointer hover:text-gray-300 transition-colors">
            <input
              type="checkbox"
              className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-purple-500 focus:ring-purple-500"
              onChange={(e) => {
                if (e.target.checked) {
                  localStorage.setItem("fw_preferred_ui", "remember");
                } else {
                  localStorage.removeItem("fw_preferred_ui");
                }
              }}
            />
            <span className="text-sm">Remember my choice for next time</span>
          </label>
        </div>
      </div>
    </div>
  );
};

export default UISelector;
