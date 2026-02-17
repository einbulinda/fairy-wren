import React from "react";

const SkeletonLoader = ({ type = "card", count = 1 }) => {
  const renderSkeleton = () => {
    switch (type) {
      case "card":
        return (
          <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 animate-pulse">
            <div className="flex justify-between items-start mb-4">
              <div className="space-y-2 flex-1">
                <div className="h-6 bg-gray-700 rounded w-3/4"></div>
                <div className="h-4 bg-gray-700 rounded w-1/2"></div>
                <div className="h-3 bg-gray-700 rounded w-2/3"></div>
              </div>
              <div className="space-y-2">
                <div className="h-8 w-24 bg-gray-700 rounded-full"></div>
                <div className="h-6 w-32 bg-gray-700 rounded"></div>
              </div>
            </div>
          </div>
        );

      case "product":
        return (
          <div className="bg-gray-800 p-4 rounded-lg border-2 border-gray-700 animate-pulse">
            <div className="w-full h-16 bg-gray-700 rounded mb-2"></div>
            <div className="h-5 bg-gray-700 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-gray-700 rounded w-1/2 mb-2"></div>
            <div className="h-3 bg-gray-700 rounded w-2/3"></div>
          </div>
        );

      case "list":
        return (
          <div className="bg-gray-800 p-3 rounded-lg animate-pulse">
            <div className="flex items-center justify-between">
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-700 rounded w-2/3"></div>
                <div className="h-3 bg-gray-700 rounded w-1/2"></div>
              </div>
              <div className="h-6 w-20 bg-gray-700 rounded"></div>
            </div>
          </div>
        );

      case "table":
        return (
          <div className="bg-gray-800 rounded-lg overflow-hidden animate-pulse">
            <div className="h-12 bg-gray-700 mb-2"></div>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-10 bg-gray-750 mb-1"></div>
            ))}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index}>{renderSkeleton()}</div>
      ))}
    </div>
  );
};

export default SkeletonLoader;
