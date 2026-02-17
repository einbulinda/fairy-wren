export const usersBills = (bills, user) => {
  if (["owner", "bartender", "manager"].includes(user.role)) return bills;

  const filteredBills = bills.filter((bill) => bill.waitress_id === user.id);

  return filteredBills;
};

export const formatCurrency = (value) =>
  new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
  }).format(value || 0);

// Title Case
export const titleCase = (s) => {
  return s
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

export const printReceipt = () => {
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
              size: 72mm auto;
              margin: 0;
            }
            body {
              margin: 0;
              padding: 0;
              width: 70mm;
              font-family: 'Courier New', monospace;
              font-size: 8pt;
              color: #000;
            }

            .thermal-row,
            .thermal-item-details {
              max-width:70mm;
              font-size: 7.5pt;
              box-sizing: border-box;
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