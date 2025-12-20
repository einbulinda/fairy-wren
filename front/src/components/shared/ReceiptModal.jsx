import { useState } from "react";
import { X, DollarSign } from "lucide-react";
import { calculateBillTotals } from "../../utils/calculations";
import PaymentModal from "./PaymentModal";

const ReceiptModal = ({ bill, onClose }) => {
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const totals = calculateBillTotals(bill);

  const handleMarkAsPaid = () => {
    setShowPaymentModal(true);
  };

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl border-2 border-pink-500 max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-2xl font-bold text-pink-500">Final Receipt</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white"
            >
              <X size={24} />
            </button>
          </div>
          <div className="bg-gray-900 p-6 rounded-lg mb-4">
            {/* Start: Receipt header */}
            <div className="text-center mb-6">
              <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-linear-to-r from-pink-500 to-purple-500">
                FAIRY WREN
              </h1>
              <p className="text-gray-400 text-sm">Hashers Club</p>
            </div>
            {/* End: Receipt header */}

            {/* Start: Bill info */}
            <div className="border-t border-b border-gray-700 py-4 mb-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-gray-400">Bill #:</div>
                <div className="text-right">{bill.id.slice(0, 8)}</div>
                <div className="text-gray-400">Customer:</div>
                <div className="text-right font-semibold">
                  {bill.customer_name}
                </div>
                <div className="text-gray-400">Served By:</div>
                <div className="text-right">{bill.waitress_name}</div>
                <div className="text-gray-400">Date:</div>
                <div className="text-right">
                  {new Date(bill.created_at).toLocaleString()}
                </div>
              </div>
            </div>
            {/* End: Bill info */}

            {/* Start: Items by round */}
            <div className="space-y-4 mb-4">
              {bill.rounds.map((round, idx) => (
                <div key={idx} className="border-b border-gray-700 pb-3">
                  <div className="text-xs text-purple-400 mb-2">
                    Round {round.round_number} -{" "}
                    {new Date(round.added_at).toLocaleTimeString()}
                  </div>
                  {round.round_items.map((item, itemIdx) => (
                    <div
                      key={itemIdx}
                      className="flex justify-between text-sm mb-1"
                    >
                      <span>
                        {item.quantity}x {item.product_name}
                      </span>
                      <span className="font-semibold">
                        {(item.price * item.quantity).toFixed(2)} KES
                      </span>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            {/* End: Items by round */}

            {/* Start: Totals */}
            <div className="border-t border-gray-700 pt-4 space-y-2">
              <div className="flex justify-between text-lg">
                <span>Subtotal:</span>
                <span className="font-semibold">
                  {totals.subtotal.toFixed(2)} KES
                </span>
              </div>
              {/* <div className="flex justify-between text-gray-400">
                <span>VAT (0%):</span>
                <span>{totals.tax.toFixed(2)} KES</span>
              </div> */}
              <div className="flex justify-between text-2xl font-bold text-pink-500 border-t border-gray-700 pt-2">
                <span>TOTAL:</span>
                <span>{totals.total.toFixed(2)} KES</span>
              </div>
            </div>
            {/* End: Totals */}

            {/* Start: Footer */}
            <div className="text-center mt-6 text-xs text-gray-500">
              <p>Thank you for visiting!</p>
              <p>Please come again</p>
            </div>
            {/* End: Footer */}
          </div>

          <button
            onClick={handleMarkAsPaid}
            className="w-full py-3 bg-linear-to-r from-green-600 to-emerald-600 rounded-lg font-semibold hover:from-green-700 hover:to-emerald-700 flex items-center justify-center"
          >
            <DollarSign size={20} className="mr-2" />
            Mark as Paid
          </button>
        </div>
      </div>

      {showPaymentModal && (
        <PaymentModal
          totals={totals}
          billId={bill.id}
          onClose={onClose}
          onCloseModal={() => setShowPaymentModal(false)}
        />
      )}
    </>
  );
};

export default ReceiptModal;
