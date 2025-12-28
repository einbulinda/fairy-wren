import { X } from "lucide-react";
import { calculateBillTotals } from "../../utils/calculations";

const OpenBillsModal = ({ bills, onSelectBill, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 p-6 w-full rounded-lg border-2 border-pink-500 max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-2xl font-bold text-pink-500">Open Bills</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={24} />
          </button>
        </div>

        <div className="overflow-y-auto space-y-3 flex-1">
          {bills.map((bill) => {
            const totals = calculateBillTotals(bill);
            return (
              <div
                key={bill.id}
                onClick={() => onSelectBill(bill)}
                className="bg-gray-700 p-4 rounded-lg border-2 border-purple-500 hover:border-pink-500 cursor-pointer transition-all"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-lg font-bold">{bill.customer_name}</h4>
                    <p className="text-sm text-gray-400">
                      Bill #{bill?.id.slice(0, 8)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(bill.created_at).toLocaleDateString()}
                    </p>
                    <p className="text-sm text-gray-400 mt-1">
                      {bill.rounds.length} rounds
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="px-3 py-1 bg-green-600 rounded-full text-sm font-semibold mb-2">
                      Open
                    </div>
                    <div className="text-xl font-bold text-pink-500">
                      {totals.total.toFixed(2)} KES
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {bills.length === 0 && (
            <div className="text-gray-500 text-center py-12">
              No open bills available.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OpenBillsModal;
