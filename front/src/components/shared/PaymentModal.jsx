import { useState } from "react";
import toast from "react-hot-toast";
import { useBills } from "../../hooks/useBills";
import { USER_ROLES } from "../../utils/constants";
import { useAuth } from "../../hooks/useAuth";

const PaymentModal = ({ totals, billId, onCloseModal, onClose }) => {
  const {
    confirmPayment: confirmPaymentAPI,
    payBill: markBillAsPaid,
    reload,
  } = useBills();
  const { user } = useAuth();
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [mpesaCode, setMpesaCode] = useState("");
  const [loading, setLoading] = useState(false);

  const confirmPayment = async () => {
    if (paymentMethod === "mpesa" && !mpesaCode.trim()) {
      toast.error("Please enter MPESA code");
      return;
    }

    setLoading(true);
    try {
      if (user.role === USER_ROLES.BARTENDER) {
        //   Bartender auto confirms bills
        await confirmPaymentAPI({
          billId,
          paymentMethod,
          mpesaCode,
          user: user.id,
        });
        toast.success("Bill completed and auto-confirmed!");
      } else {
        // Waitress needs bartender confirmation
        const billDtls = {
          paymentMethod,
          mpesaCode: paymentMethod === "mpesa" ? mpesaCode : null,
          markedBy: user.name,
        };

        await markBillAsPaid(billId, billDtls);
        toast.success("Bill marked as paid! Awaiting bartender confirmation.");
      }

      onClose();
    } catch (error) {
      toast.error("Failed to process payment");
      console.error(error);
    } finally {
      reload();
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-60">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md border-2 border-pink-500">
        <h3 className="text-2xl font-bold text-pink-500 mb-4">
          Payment Details
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">
              Payment Method
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 border border-purple-500 rounded-lg text-white focus:outline-none focus:border-pink-500"
            >
              <option value="cash">Cash</option>
              <option value="mpesa">MPESA Paybill</option>
            </select>
          </div>

          {paymentMethod === "mpesa" && (
            <div>
              <label className="block text-sm text-gray-400 mb-2">
                MPESA Transaction Code
              </label>
              <input
                type="text"
                value={mpesaCode}
                onChange={(e) => setMpesaCode(e.target.value)}
                placeholder="Enter transaction code"
                autocapitalize="characters"
                className="w-full px-4 py-2 bg-gray-700 border border-purple-500 rounded-lg text-white focus:outline-none focus:border-pink-500"
              />
            </div>
          )}
          <div className="border-t border-gray-700 pt-4">
            <div className="flex justify-between text-2xl font-bold text-pink-500">
              <span>Total Bill Amount:</span>
              <span>{totals.total.toFixed(2)} KES</span>
            </div>
          </div>

          <div className="flex space-x-2">
            <button
              onClick={() => confirmPayment(billId)}
              disabled={loading}
              className="flex-1 py-3 bg-green-600 rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Processing..." : "Confirm Payment"}
            </button>

            <button
              onClick={onCloseModal}
              disabled={loading}
              className="flex-1 py-3 bg-gray-600 rounded-lg font-semibold hover:bg-gray-700"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;
