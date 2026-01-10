import { useState } from "react";
import { X, DollarSign, Printer } from "lucide-react";
import { calculateBillTotals } from "../../utils/calculations";
import PaymentModal from "../../trash/PaymentModal";
import fwLogo from "/fairy-logo-only.png";
import { RECEIPT_LOGO_BASE64 } from "../../utils/receiptAssets";
import { titleCase } from "../../utils/common";

const ReceiptModal = ({ bill, onClose }) => {
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const totals = calculateBillTotals(bill);

  const handleMarkAsPaid = () => {
    setShowPaymentModal(true);
  };

  const handlePrint = () => {
    const customerReceipt = document.querySelector(".thermal-receipt-customer");
    const fairyReceipt = document.querySelector(".thermal-receipt-fairy");

    if (!customerReceipt || !fairyReceipt) return;

    const printSingleCopy = (content, title) => {
      const win = window.open("", "", "width=380,height=600");

      win.document.write(`
      <html>
        <head>
          <title>${title}</title>
          <style>
            @page {
              size: 80mm auto;
              margin: 0;
            }
            body {
              margin: 0;
              padding: 0;
              width: 80mm;
              font-family: 'Courier New', monospace;
              font-size: 9pt;
              color: #000;
              // text-align:center;
            }

            .thermal-row,
            .thermal-item-details {
              display: flex;
              justify-content: space-between;
              text-align: left;
            }
            .receipt-copy {
              padding: 5mm;
              page-break-after: always;
            }
            .receipt-copy:last-child {
              page-break-after: auto;
            }
            img {
              display: block;
              margin: 0 auto 6px auto;
              max-width: 120px;
              height: auto;
            }
            .copy-label {
              text-align: center;
              font-size: 11pt;
              font-weight: bold;
              margin: 8px 0;
              padding: 4px;
              border-top: 2px dashed #000;
              border-bottom: 2px dashed #000;
            }
            .thermal-logo-img {
              display: block;
              margin: 0 auto 4px auto;
              max-width: 45px;
              width: 45px;
              height: auto;
            }
            .thermal-header {
              text-align: center;
              margin-bottom: 6px;
            }
            .thermal-logo {
              font-size: 14pt;
              font-weight: bold;
              margin-bottom: 2px;
            }
            .thermal-subtitle {
              font-size: 8pt;
              margin-bottom: 4px;
            }
            .thermal-divider {
              margin: 4px 0;
              font-size: 8pt;
              text-align: center;
            }
            .thermal-divider-bold {
              margin: 4px 0;
              font-weight: bold;
              font-size: 8pt;
            }
            .thermal-info {
              margin-bottom: 8px;
            }
            .thermal-row {
              display: flex;
              justify-content: space-between;
              margin: 2px 0;
              font-size: 8pt;
            }
            .thermal-items {
              margin-bottom: 8px;
            }
            .thermal-round {
              margin-bottom: 8px;
            }
            .thermal-round-header {
              font-size: 8pt;
              font-weight: bold;
              margin-bottom: 4px;
            }
            .thermal-item {
              margin-bottom: 4px;
            }
            .thermal-item-name {
              font-size: 9pt;
              font-weight: bold;
              margin-bottom: 1px;
            }
            .thermal-item-details {
              display: flex;
              justify-content: space-between;
              font-size: 8pt;
            }
            .thermal-item-total {
              font-weight: bold;
            }
            .thermal-totals {
              margin-bottom: 8px;
            }
            .thermal-grand-total {
              font-size: 11pt;
              font-weight: bold;
              margin: 4px 0;
            }
            .thermal-footer {
              text-align: center;
              margin-top: 8px;
            }
            .thermal-qr-text {
              font-size: 9pt;
              margin: 4px 0;
            }
            .thermal-thanks {
              font-size: 9pt;
              margin: 4px 0;
            }
            .thermal-thanks-sub {
              font-size: 9pt;
              font-weight: bold;
              margin: 2px 0;
            }
            .thermal-id {
              font-size: 7pt;
              margin-top: 6px;
              color: #666;
            }
          </style>
        </head>
        <body>${content}</body>
      </html>
    `);

      win.document.close();
      win.focus();

      // Give Chrome time to render images
      setTimeout(() => {
        win.print();
        win.close();
      }, 300);
    };

    // 1️⃣ Customer copy (printer cuts after job)
    printSingleCopy(customerReceipt.innerHTML, "Customer Receipt");

    // 2️⃣ Bartender copy (printer cuts again)
    setTimeout(() => {
      printSingleCopy(fairyReceipt.innerHTML, "Bar Receipt");
    }, 800);
  };

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

  return (
    <>
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-50 no-print">
        <div
          className="bg-gray-800 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-2xl border-2 border-pink-500 max-h-[95vh] sm:max-h-[90vh]
        overflow-hidden flex flex-col animate-slide-up"
        >
          {/* Header */}
          <div className="flex justify-between items-center p-4 sm:p-6 border-b border-gray-700 shrink-0">
            <h3 className="text-xl sm:text-2xl font-bold text-pink-500">
              Final Receipt
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrint}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors hidden"
                title="Print Receipt"
              >
                <Printer size={20} className="text-gray-400 hover:text-white" />
              </button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                title="Close Modal"
              >
                <X size={24} className="text-gray-400 hover:text-white" />
              </button>
            </div>
          </div>

          {/* Receipt Content - Scrollable */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            {/* Screen Preview (not printed) */}
            <div className="bg-linear-to-br from-gray-900 to-gray-800 p-6 sm:p-8 rounded-xl border border-gray-700 shadow-2xl no-print">
              {/* Start: Receipt header */}
              <div className="text-center mb-6">
                <div className="inline-block bg-linear-to-br from-pink-500 to-purple-500 p-4 rounded-2xl mb-4">
                  <img
                    src={fwLogo}
                    alt="Fairy Wren"
                    className="h-16 w-auto brightness-0 invert"
                  />
                </div>

                <h1 className="text-2xl sm:text-3xl font-bold text-transparent bg-clip-text bg-linear-to-r from-pink-500 to-purple-500 mb-1">
                  FAIRY WREN
                </h1>
                <p className="text-sm text-gray-400">Hashers Club - Utawala</p>
                <div className="w-full h-px bg-linear-to-r from-transparent via-pink-500 to-transparent mt-4"></div>
              </div>
              {/* End: Receipt header */}

              {/* Start: Bill info */}
              <div className="bg-gray-800/50 rounded-lg p-4 mb-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="text-gray-400">Bill #</div>
                  <div className="text-right font-mono text-pink-400">
                    {bill.id.slice(0, 8).toUpperCase()}
                  </div>
                  <div className="text-gray-400">Customer</div>
                  <div className="text-right font-semibold text-white truncate">
                    {titleCase(bill.customer_name)}
                  </div>
                  <div className="text-gray-400">Served By:</div>
                  <div className="text-right text-white truncate">
                    {titleCase(bill.created_by_user.name)}
                  </div>
                  <div className="text-gray-400">Date</div>
                  <div className="text-right text-white">
                    {new Date(bill.created_at).toLocaleDateString()}
                  </div>
                  <div className="text-gray-400">Time</div>
                  <div className="text-right text-white">
                    {new Date(bill.created_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              </div>
              {/* End: Bill info */}

              {/* Start: Items by round */}
              <div className="mb-4">
                <div className="w-full h-px bg-linear-to-r from-transparent via-purple-500 to-transparent mb-3"></div>
                {bill.rounds.map((round) => (
                  <div key={round.id} className="mb-4">
                    <div className="text-xs font-semibold text-purple-400 mb-2 flex items-center gap-2">
                      <span className="bg-purple-500/20 px-2 py-1 rounded">
                        ROUND {round.round_number}
                      </span>
                      <span className="text-gray-500">
                        {new Date(round.created_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {round.round_items.map((item) => (
                        <div
                          key={item.id}
                          className="flex justify-between text-sm"
                        >
                          <div className="flex-1">
                            <div className="font-medium text-white">
                              {item.product.name}
                            </div>
                            <div className="text-xs text-gray-400">
                              {item.quantity} x KSh.{" "}
                              {item.price.toLocaleString()}
                            </div>
                          </div>
                          <div className="font-bold text-pink-400 ml-4">
                            KSh. {(item.price * item.quantity).toLocaleString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                <div className="w-full h-px bg-linear-to-r from-transparent via-purple-500 to-transparent my-3"></div>
              </div>

              {/* End: Items by round */}

              {/* Start: Totals */}
              <div className="bg-linear-to-br from-pink-500/10 to-purple-500/10 border border-pink-500/30 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-base text-gray-300">
                  <span>Subtotal</span>
                  <span className="font-semibold">
                    KSh. {totals.subtotal.toLocaleString()}
                  </span>
                </div>
                <div className="w-full h-px bg-pink-500/20"></div>
                <div className="flex justify-between text-xl sm:text-2xl font-bold text-transparent bg-clip-text bg-linear-to-r from-pink-500 to-purple-500">
                  <span>TOTAL</span>
                  <span>KSh. {totals.total.toLocaleString()}</span>
                </div>
              </div>
              {/* End: Totals */}

              {/* Start: Footer */}
              <div className="text-center mt-6 space-y-2">
                <div className="w-full h-px bg-linear-to-r from-transparent via-pink-500 to-transparent mb-3"></div>
                <p className="text-sm text-gray-400">
                  Thank you for your visit!
                </p>
                <p className="text-sm text-pink-400 font-semibold">
                  Please come again! 🍻
                </p>
                <p className="text-xs text-gray-600 mt-3">ID: {bill.id}</p>
              </div>
              {/* End: Footer */}
            </div>
          </div>

          {/* Hidden Thermal Print Templates */}
          {/* Customer Copy */}
          <div className="thermal-receipt-customer">
            {renderReceiptContent({ showLogo: true })}
          </div>

          {/* Fairy Copy (Bartender) */}
          <div className="thermal-receipt-fairy">
            {renderReceiptContent({ showLogo: false })}
          </div>

          <div className="p-4 sm:p-6 border-t border-gray-700 shrink-0 space-y-2 sm:space-y-0 sm:flex sm:gap-2 no-print">
            <button
              onClick={handlePrint}
              className="w-full sm:flex-1 py-2.5 sm:py-3 bg-linear-to-r from-blue-600 to-indigo-600 rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 flex items-center justify-center transition-all active:scale-95 text-sm sm:text-base"
            >
              <Printer size={18} className="mr-2" /> Print Receipt (2 Copies)
            </button>
            <button
              onClick={handleMarkAsPaid}
              className="w-full sm:flex-1 py-2.5 sm:py-3 bg-linear-to-r from-green-600 to-emerald-600 rounded-lg font-semibold hover:from-green-700 hover:to-emerald-700 flex items-center justify-center transition-all active:scale-95 text-sm sm:text-base"
            >
              <DollarSign size={18} className="mr-2" />
              Mark as Paid
            </button>
          </div>
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
