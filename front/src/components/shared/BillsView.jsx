import { Search, Receipt } from "lucide-react";
import { useMemo, useState } from "react";
import { useBills } from "../../hooks/useBills";
import { calculateBillTotals } from "../../utils/calculations";
import LoadingSpinner from "./LoadingSpinner";

const BillsView = () => {
  const { bills, isLoading } = useBills();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredBills = useMemo(() => {
    if (!searchQuery.trim()) return bills;

    return bills.filter((bill) =>
      bill.customer_name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, bills]);

  const getStatusColor = (status) => {
    switch (status) {
      case "completed":
        return "bg-green-600";
      case "awaiting_confirmation":
        return "bg-yellow-600";
      case "open":
        return "bg-blue-600";
      default:
        return "bg-gray-600";
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case "awaiting_confirmation":
        return "Pending Confirm";
      default:
        return status;
    }
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-pink-500">All Bills</h2>
        <div className="flex items-center space-x-2 bg-gray-800 px-4 py-2 rounded-lg border border-gray-700">
          <Search size={18} className="text-gray-400" />
          <input
            type="text"
            placeholder="Search by customer name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent border-none outline-none text-white w-64"
          />
        </div>
      </div>

      <div className="grid gap-4">
        {filteredBills.map((bill) => {
          const totals = calculateBillTotals(bill);

          return (
            <div
              key={bill.id}
              className="bg-gray-800 p-4 rounded-lg border border-gray-700"
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="text-xl font-bold">{bill.customer_name}</h3>
                  <p className="text-sm text-gray-400">
                    Served By: {bill.waitress_name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(bill.created_at).toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-400 mt-1">
                    {bill?.rounds.length} rounds
                  </p>
                </div>
                <div className="text-right">
                  <div
                    className={`px-3 py-1 rounded-full text-sm text-center font-semibold ${getStatusColor(
                      bill.status
                    )}`}
                  >
                    {getStatusLabel(bill.status)}
                  </div>
                  <div className="text-2xl font-bold text-pink-500 mt-2">
                    {totals.total.toFixed(2)} KES
                  </div>
                  {bill.payment_method && (
                    <div className="text-sm text-gray-400">
                      {bill.payment_method.toUpperCase()}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {filteredBills.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            <Receipt size={48} className="mx-auto mb-2 opacity-50" />
            <p>No bills found</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BillsView;
