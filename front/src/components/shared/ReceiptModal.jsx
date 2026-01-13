import { X, Printer } from "lucide-react";
import { calculateBillTotals } from "../../utils/calculations";
import { RECEIPT_LOGO_BASE64 } from "../../utils/receiptAssets";
import { printReceipt, titleCase } from "../../utils/common";

const ReceiptModal = ({ bill, onClose }) => {
  const totals = calculateBillTotals(bill);

  // Render receipt content function to avoid duplication
  const renderReceiptContent = ({ showLogo = true } = {}) => (
    <>
      <div className="thermal-header text-center">
        {showLogo && (
          <img
            src={RECEIPT_LOGO_BASE64}
            alt="Fairy Wren"
            className="thermal-logo-img"
          />
        )}
        <div className="thermal-logo">★ FAIRY WREN ★</div>
        <div className="thermal-subtitle">Hashers Club - Utawala</div>
        <div className="thermal-divider">
          ----------------------------------------
        </div>
      </div>

      <div className="thermal-info">
        <div className="thermal-row">
          <span>Bill #:</span>
          <span>{bill.id.slice(0, 8).toUpperCase()}</span>
        </div>
        <div className="thermal-row">
          <span>Customer:</span>
          <span>{titleCase(bill.customer_name)}</span>
        </div>
        <div className="thermal-row">
          <span>Served By:</span>
          <span>{titleCase(bill.created_by_user.name)}</span>
        </div>
        <div className="thermal-row">
          <span>Date:</span>
          <span>{new Date(bill.created_at).toLocaleDateString()}</span>
        </div>
        <div className="thermal-row">
          <span>Time:</span>
          <span>
            {new Date(bill.created_at).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
        <div className="thermal-divider">
          ----------------------------------------
        </div>
      </div>

      <div className="thermal-items">
        {bill.rounds.map((round, idx) => (
          <div key={idx} className="thermal-round">
            <div className="thermal-round-header">
              ROUND {round.round_number} -{" "}
              {new Date(round.created_at).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
            {round.round_items.map((item) => (
              <div key={item.id} className="thermal-item">
                <div className="thermal-item-name">{item.product.name}</div>
                <div className="thermal-item-details">
                  <span>
                    {item.quantity} x {item.price.toLocaleString()}
                  </span>
                  <span className="thermal-item-total">
                    {(item.price * item.quantity).toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ))}
        <div className="thermal-divider">
          ----------------------------------------
        </div>
      </div>

      <div className="thermal-totals">
        <div className="thermal-row">
          <span>SUBTOTAL:</span>
          <span>KSh. {totals.subtotal.toLocaleString()}</span>
        </div>
        <div className="thermal-divider-bold">
          ----------------------------------------
        </div>
        <div className="thermal-row thermal-grand-total">
          <span>TOTAL:</span>
          <span>KSh. {totals.total.toLocaleString()}</span>
        </div>
      </div>

      <div className="thermal-footer">
        <div className="thermal-divider">
          ----------------------------------------
        </div>
        <div className="thermal-qr-text">
          PayBill: 522522
          <br />
          Account: 8040662
        </div>
        <div className="thermal-divider">
          ----------------------------------------
        </div>
        <div className="thermal-thanks">Thank you for your visit!</div>
        <div className="thermal-thanks-sub">Please come again!</div>
        <div className="thermal-id">Bill ID: {bill.id}</div>
      </div>
    </>
  );

  // Handle backdrop click to close
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-50 no-print"
        onClick={handleBackdropClick}
      >
        <div className="bg-linear-to-br from-gray-900/95 to-gray-800/95 backdrop-blur-md rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md border-2 border-purple-500/30 max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col animate-slide-up shadow-2xl shadow-purple-500/20">
          {/* Header */}
          <div className="flex justify-between items-center p-4 border-b border-purple-500/20 shrink-0 bg-gray-900/50">
            <h3 className="text-lg font-bold text-transparent bg-clip-text bg-linear-to-r from-pink-400 to-purple-400">
              Receipt Preview
            </h3>
            <button
              onClick={onClose}
              className="p-2 hover:bg-purple-500/20 rounded-lg transition-colors"
              title="Close"
            >
              <X size={20} className="text-purple-300 hover:text-white" />
            </button>
          </div>

          {/* Receipt Content - Thermal Style with Theme */}
          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
            <div className="bg-gray-900/60 backdrop-blur-sm rounded-xl border border-purple-500/20 p-6 font-mono text-sm shadow-xl">
              {/* Header */}
              <div className="text-center mb-4 pb-3 border-b-2 border-dashed border-purple-500/30">
                <div className="text-2xl font-bold text-pink-400 mb-1 tracking-wider">
                  ★ FAIRY WREN ★
                </div>
                <div className="text-xs text-purple-300">
                  Hashers Club - Utawala
                </div>
              </div>

              {/* Bill Info */}
              <div className="space-y-1.5 mb-4 pb-3 border-b-2 border-dashed border-purple-500/30">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">Bill #:</span>
                  <span className="text-pink-400 font-semibold">
                    {bill.id.slice(0, 8).toUpperCase()}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">Customer:</span>
                  <span className="text-white font-semibold">
                    {titleCase(bill.customer_name)}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">Served By:</span>
                  <span className="text-white">
                    {titleCase(bill.created_by_user.name)}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">Date:</span>
                  <span className="text-white">
                    {new Date(bill.created_at).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">Time:</span>
                  <span className="text-white">
                    {new Date(bill.created_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>

              {/* Items by Round */}
              <div className="space-y-3 mb-4 pb-3 border-b-2 border-dashed border-purple-500/30">
                {bill.rounds.map((round, idx) => (
                  <div key={idx} className="space-y-2">
                    <div className="text-xs font-bold text-purple-400 flex items-center gap-2">
                      <span className="bg-purple-500/20 px-2 py-0.5 rounded">
                        ROUND {round.round_number}
                      </span>
                      <span className="text-gray-500">
                        {new Date(round.created_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    {round.round_items.map((item) => (
                      <div key={item.id} className="space-y-0.5">
                        <div className="text-xs font-bold text-white">
                          {item.product.name}
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-400">
                            {item.quantity} x KSh. {item.price.toLocaleString()}
                          </span>
                          <span className="text-pink-400 font-bold">
                            KSh. {(item.price * item.quantity).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400 font-bold">SUBTOTAL:</span>
                  <span className="text-white font-semibold">
                    KSh. {totals.subtotal.toLocaleString()}
                  </span>
                </div>
                <div className="border-t-2 border-purple-500/30 pt-2">
                  <div className="flex justify-between text-base">
                    <span className="text-purple-300 font-bold">TOTAL:</span>
                    <span className="text-pink-400 font-bold text-lg">
                      KSh. {totals.total.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="text-center space-y-2 pt-3 border-t-2 border-dashed border-purple-500/30">
                <div className="text-xs text-purple-300">
                  <div>PayBill: 522522</div>
                  <div>Account: 8040662</div>
                </div>
                <div className="text-xs text-gray-400 pt-2">
                  Thank you for your visit!
                </div>
                <div className="text-xs text-pink-400 font-semibold">
                  Please come again!
                </div>
                <div className="text-[10px] text-gray-600 pt-2">
                  Bill ID: {bill.id}
                </div>
              </div>
            </div>
          </div>

          {/* Print Button */}
          <div className="p-4 border-t border-purple-500/20 shrink-0 bg-gray-900/50 no-print">
            <button
              onClick={printReceipt}
              className="w-full py-4 bg-linear-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-xl font-bold transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-purple-500/30 text-base touch-manipulation"
            >
              <Printer size={20} />
              Print Receipt (2 Copies)
            </button>
          </div>
        </div>
      </div>

      {/* Hidden Thermal Print Templates */}
      <div className="thermal-receipt-customer">
        {renderReceiptContent({ showLogo: true })}
      </div>

      <div className="thermal-receipt-fairy">
        {renderReceiptContent({ showLogo: false })}
      </div>

      <style jsx>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }

        /* Custom Scrollbar */
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(139, 92, 246, 0.1);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(236, 72, 153, 0.5);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(236, 72, 153, 0.7);
        }

        /* Hide thermal receipts on screen */
        .thermal-receipt-customer,
        .thermal-receipt-fairy {
          display: none;
        }

        /* Print styles are handled inline in handlePrint */
        @media print {
          body > * {
            display: none !important;
          }
        }
      `}</style>
    </>
  );
};

export default ReceiptModal;
