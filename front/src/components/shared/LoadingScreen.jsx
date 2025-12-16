import React from "react";

const LoadingScreen = ({ message = "Loading...", subtitle }) => {
  return (
    <div className="fixed inset-0 bg-linear-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center z-50">
      <div className="text-center">
        {/* Animated Nightclub Scene */}
        <div className="relative w-64 h-64 mb-8">
          {/* Disco ball effect */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="disco-ball"></div>
          </div>

          {/* Dancing Drinks */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex space-x-8 items-end">
              {/* Wine glass */}
              <div
                className="drink-container animate-dance"
                style={{ animationDelay: "0s" }}
              >
                <div className="wine-glass">
                  <div className="wine-stem"></div>
                  <div className="wine-bowl">
                    <div className="wine-liquid"></div>
                  </div>
                </div>
              </div>

              {/* Beer mug */}
              <div
                className="drink-container animate-dance"
                style={{ animationDelay: "0.3s" }}
              >
                <div className="beer-mug">
                  <div className="beer-body"></div>
                  <div className="beer-foam"></div>
                  <div className="beer-handle"></div>
                </div>
              </div>

              {/* Cocktail */}
              <div
                className="drink-container animate-dance"
                style={{ animationDelay: "0.6s" }}
              >
                <div className="cocktail-glass">
                  <div className="cocktail-stem"></div>
                  <div className="cocktail-bowl">
                    <div className="cocktail-liquid"></div>
                  </div>
                  <div className="cocktail-straw"></div>
                </div>
              </div>
            </div>
          </div>

          {/* Sparkles */}
          <div className="sparkle sparkle-1"></div>
          <div className="sparkle sparkle-2"></div>
          <div className="sparkle sparkle-3"></div>
          <div className="sparkle sparkle-4"></div>
          <div className="sparkle sparkle-5"></div>
          <div className="sparkle sparkle-6"></div>
        </div>

        {/* Text */}
        <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-linear-to-r from-pink-500 via-purple-500 to-pink-500 bg-300% animate-gradient mb-4">
          FAIRY WREN
        </h1>
        <p className="text-2xl font-semibold text-white mb-2">{message}</p>
        {subtitle && <p className="text-sm text-gray-400">{subtitle}</p>}

        {/* Loading dots */}
        <div className="flex space-x-2 justify-center mt-6">
          <div className="loading-dot"></div>
          <div className="loading-dot" style={{ animationDelay: "0.2s" }}></div>
          <div className="loading-dot" style={{ animationDelay: "0.4s" }}></div>
        </div>
      </div>

      <style jsx>{`
        @keyframes gradient {
          0%,
          100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }

        @keyframes dance {
          0%,
          100% {
            transform: translateY(0) rotate(0deg);
          }
          25% {
            transform: translateY(-15px) rotate(-5deg);
          }
          75% {
            transform: translateY(-15px) rotate(5deg);
          }
        }

        @keyframes spin-disco {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }

        @keyframes sparkle {
          0%,
          100% {
            opacity: 0;
            transform: scale(0);
          }
          50% {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes pulse-dot {
          0%,
          100% {
            transform: scale(0.8);
            opacity: 0.5;
          }
          50% {
            transform: scale(1.2);
            opacity: 1;
          }
        }

        .animate-gradient {
          background-size: 300% 300%;
          animation: gradient 3s ease infinite;
        }

        .animate-dance {
          animation: dance 1.5s ease-in-out infinite;
        }

        .disco-ball {
          width: 60px;
          height: 60px;
          background: linear-gradient(135deg, #e0e0e0 25%, transparent 25%),
            linear-gradient(225deg, #e0e0e0 25%, transparent 25%),
            linear-gradient(45deg, #e0e0e0 25%, transparent 25%),
            linear-gradient(315deg, #e0e0e0 25%, #f5f5f5 25%);
          background-size: 20px 20px;
          background-position: 0 0, 10px 0, 10px -10px, 0 10px;
          border-radius: 50%;
          box-shadow: 0 0 30px rgba(255, 107, 157, 0.5),
            inset 0 0 20px rgba(255, 255, 255, 0.3);
          animation: spin-disco 4s linear infinite;
        }

        /* Wine glass */
        .wine-glass {
          position: relative;
          width: 40px;
          height: 60px;
        }

        .wine-bowl {
          width: 40px;
          height: 40px;
          background: transparent;
          border: 3px solid rgba(255, 255, 255, 0.3);
          border-radius: 0 0 50% 50%;
          position: relative;
          overflow: hidden;
        }

        .wine-liquid {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 70%;
          background: linear-gradient(180deg, #e74c3c, #c0392b);
          border-radius: 0 0 50% 50%;
        }

        .wine-stem {
          position: absolute;
          bottom: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 3px;
          height: 25px;
          background: rgba(255, 255, 255, 0.3);
        }

        /* Beer mug */
        .beer-mug {
          position: relative;
          width: 45px;
          height: 55px;
        }

        .beer-body {
          width: 40px;
          height: 50px;
          background: linear-gradient(180deg, #f39c12, #e67e22);
          border-radius: 8px;
          box-shadow: inset 5px 0 10px rgba(255, 255, 255, 0.2);
        }

        .beer-foam {
          position: absolute;
          top: -8px;
          left: 0;
          width: 40px;
          height: 15px;
          background: white;
          border-radius: 50% 50% 0 0;
        }

        .beer-handle {
          position: absolute;
          right: -12px;
          top: 15px;
          width: 15px;
          height: 25px;
          border: 3px solid #e67e22;
          border-left: none;
          border-radius: 0 50% 50% 0;
        }

        /* Cocktail */
        .cocktail-glass {
          position: relative;
          width: 45px;
          height: 60px;
        }

        .cocktail-bowl {
          width: 45px;
          height: 35px;
          background: transparent;
          border: 3px solid rgba(255, 255, 255, 0.3);
          border-radius: 0 0 50% 50%;
          position: relative;
          overflow: hidden;
        }

        .cocktail-liquid {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 80%;
          background: linear-gradient(180deg, #3498db, #2980b9);
          border-radius: 0 0 50% 50%;
        }

        .cocktail-stem {
          position: absolute;
          bottom: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 3px;
          height: 30px;
          background: rgba(255, 255, 255, 0.3);
        }

        .cocktail-straw {
          position: absolute;
          top: -5px;
          right: 8px;
          width: 3px;
          height: 25px;
          background: linear-gradient(180deg, #e74c3c, #c0392b);
          transform: rotate(-15deg);
        }

        /* Sparkles */
        .sparkle {
          position: absolute;
          width: 8px;
          height: 8px;
          background: linear-gradient(45deg, #ff6b9d, #9d50bb);
          border-radius: 50%;
          animation: sparkle 2s ease-in-out infinite;
        }

        .sparkle-1 {
          top: 10%;
          left: 10%;
          animation-delay: 0s;
        }
        .sparkle-2 {
          top: 20%;
          right: 15%;
          animation-delay: 0.3s;
        }
        .sparkle-3 {
          top: 50%;
          left: 5%;
          animation-delay: 0.6s;
        }
        .sparkle-4 {
          bottom: 30%;
          right: 10%;
          animation-delay: 0.9s;
        }
        .sparkle-5 {
          bottom: 10%;
          left: 20%;
          animation-delay: 1.2s;
        }
        .sparkle-6 {
          top: 40%;
          right: 5%;
          animation-delay: 1.5s;
        }

        /* Loading dots */
        .loading-dot {
          width: 12px;
          height: 12px;
          background: linear-gradient(135deg, #ff6b9d, #9d50bb);
          border-radius: 50%;
          animation: pulse-dot 1.5s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default LoadingScreen;
