import React from "react";

const LoadingSpinner = ({ message = "Loading ...", size = "default" }) => {
  const sizeClasses = {
    small: "w-16 h-16",
    default: "w-24 h-24",
    large: "w-32 h-32",
  };

  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[400px]">
      {/* Animated Beer Mug */}
      <div className={`relative ${sizeClasses[size]} mb-6`}>
        {/* Beer Mug */}
        <div className="absolute inset-0 animate-bounce-slow">
          <div className="relative w-full h-full">
            {/* Mug Body */}
            <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-16 h-20 bg-linear-to-b from-amber-400 to-amber-600 rounded-lg shadow-lg">
              {/* Beer Foam */}
              <div className="absolute -top-3 left-0 right-0 h-6 bg-white rounded-t-lg animate-pulse">
                {/* Foam Bubbles */}
                <div className="bg-white absolute top-0 left-2 w-3 h-3 rounded-full opacity-80"></div>
                <div className="bg-white absolute top-1 right-3 w-2 h-2 rounded-full opacity-60"></div>
                <div className="bg-white absolute -top-1 left-6 w-2.5 h-2.5 rounded-full opacity-70"></div>
              </div>

              {/* Mug Handle */}
              <div className="absolute -right-4 border-amber-600 top-4 w-6 h-8 border-4 rounded-r-full"></div>

              {/* Beer Shine Effect */}
              <div className="absolute top-4 left-2 bg-linear-to-r from-yellow-200 to-transparent opacity-40 rounded-full w-3 h-8 "></div>
            </div>
          </div>
        </div>

        {/* Floating Bubbles */}
        <div className="absolute inset-0">
          <div className="bubble bubble-1"></div>
          <div className="bubble bubble-2"></div>
          <div className="bubble bubble-3"></div>
        </div>
      </div>

      {/* Loading Text */}
      <div className="text-center">
        <p className="text-xl font-semibold text-transparent bg-clip-text bg-linear-to-r from-pink-500 to-purple-500 mb-2">
          {message}
        </p>
        <div className="flex  space-x-2 justify-center">
          <div className="w-2 h-2 rounded-full animate-bounce bg-pink-500"></div>
          <div className="w-2 h-2 rounded-full animate-bounce bg-purple-500"></div>
          <div className="w-2 h-2 rounded-full animate-bounce bg-pink-500"></div>
        </div>
      </div>

      <style jsx>{`
        @keyframes bounce-slow {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        @keyframes float-up {
          0% {
            transform: translateY(0) scale(0);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            transform: translateY(-60px) scale(1);
            opacity: 0;
          }
        }

        .animate-bounce-slow {
          animation: bounce-slow 2s ease-in-out infinite;
        }

        .bubble {
          position: absolute;
          bottom: 20px;
          width: 8px;
          height: 8px;
          background: radial-gradient(
            circle at 30% 30%,
            rgba(255, 255, 255, 0.8),
            rgba(147, 197, 253, 0.4)
          );
          border-radius: 50%;
          animation: float-up 3s ease-in-out infinite;
        }

        .bubble-1 {
          left: 35%;
          animation-delay: 0s;
        }

        .bubble-2 {
          left: 50%;
          animation-delay: 1s;
          width: 6px;
          height: 6px;
        }

        .bubble-3 {
          left: 65%;
          animation-delay: 2s;
          width: 10px;
          height: 10px;
        }
      `}</style>
    </div>
  );
};

export default LoadingSpinner;
