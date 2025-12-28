import { useMemo } from "react";
import { useAuth } from "../../hooks/useAuth";
import { useBills } from "../../hooks/useBills";
import LoadingSpinner from "../shared/LoadingSpinner";
import { Check, ClipboardCheck } from "lucide-react";
import { calculateBillTotals } from "../../utils/calculations";
import toast from "react-hot-toast";

const ConfirmPayments = () => {
  const { user } = useAuth();
  const { confirmPayment, bills, isLoading, reload } = useBills();

  const awaitingConfirmation = useMemo(() => {
    return bills.filter((bill) => bill.status === "awaiting_confirmation");
  }, [bills]);

  const handleConfirmPayment = async (billId) => {
    const confirmed = window.confirm("Confirm that payment has been received?");
    if (!confirmed) return;

    try {
      const confirmingUser = { confirmedBy: user.id };
      await confirmPayment(billId, confirmingUser);
      toast.success("Payment confirmed!");
      reload();
    } catch (error) {
      toast.error("Failed to confirm payment");
      console.error(error);
    }
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-pink-500">Confirm Payments</h2>

      {awaitingConfirmation.length > 0 ? (
        <div className="grid gap-4">
          {awaitingConfirmation.map((bill) => {
            const totals = calculateBillTotals(bill);

            return (
              <div
                key={bill.id}
                className="bg-gray-800 p-6 rounded-lg border-2 border-yellow-600"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-2xl font-bold text-yellow-400">
                      {bill.customer_name}
                    </h3>
                    <p className="text-sm text-gray-400">
                      Served By: {bill.waitress_name}
                    </p>

                    <p className="text-xs text-gray-500">
                      {bill.marked_paid_at &&
                        new Date(bill.marked_paid_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="px-4 py-2 bg-yellow-600 rounded-full text-sm font-semibold mb-2">
                      Awaiting Confirmation
                    </div>
                    <div className="text-3xl font-bold text-pink-500">
                      {totals.total.toFixed(2)} KES
                    </div>
                    <div className="text-sm text-gray-400 mt-1">
                      {bill.payment_method.toUpperCase()}
                    </div>

                    {bill.mpesa_code && (
                      <div className="text-xs text-gray-500">
                        Code: {bill.mpesa_code}
                      </div>
                    )}
                  </div>
                </div>

                {/* Start: Bill details */}
                <div className="bg-gray-700 p-3 rounded mb-4">
                  <h4 className="font-semibold text-sm text-gray-400 mb-2">
                    Bill Details
                  </h4>

                  {bill.rounds.map((round) => (
                    <div key={round.id} className="mb-2">
                      <div className="text-xs text-purple-400">
                        Round {round.round_number}
                      </div>
                      {round.round_items.map((item) => (
                        <div
                          key={item.id}
                          className="flex justify-between text-sm"
                        >
                          <span>
                            {item.quantity}x {item.product_name}
                          </span>
                          <span className="text-pink-500">
                            {(item.price * item.quantity).toFixed(2)} KES
                          </span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
                {/* End: Bill details */}

                <button
                  onClick={() => handleConfirmPayment(bill.id)}
                  className="w-full py-3 bg-green-600 rounded-lg font-semibold hover:bg-green-700 flex items-center justify-center"
                >
                  <Check size={20} className="mr-2" />
                  Confirm Payment Received
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center text-gray-500 py-12 bg-gray-800 rounded-lg">
          <ClipboardCheck size={64} className="mx-auto mb-4 opacity-50" />
          <p className="text-xl">No payments pending confirmation</p>
          <p className="text-sm mt-2">
            Bills will appear here when waitresses mark them as paid
          </p>
        </div>
      )}
    </div>
  );
};

export default ConfirmPayments;
