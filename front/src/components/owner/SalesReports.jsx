import { Calendar } from "lucide-react";
import React from "react";

const SalesReports = () => {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-pink-500">Sales Reports</h2>

      <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
        <h3 className="font-semibold mb-3 flex items-center">
          <Calendar size={18} className="mr-2 text-pink-500" />
          Select Date Range
        </h3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalesReports;
