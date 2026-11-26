import { MpesaService } from "@/services/mpesa.service";
import { PaymentService } from "@/services/payment.service";

/** Can this user match KCB M-Pesa payments to bills? */
export const canAllocateMpesa = (user) =>
  ["owner", "admin"].includes(user?.role) || !!user?.permissions?.includes("allocate_mpesa");

/** Can this user reverse matches and see full phone numbers? */
export const canManageMpesa = (user) =>
  ["owner", "admin"].includes(user?.role) || !!user?.permissions?.includes("manage_mpesa");

export const round2 = (n) => Math.round(Number(n) * 100) / 100;

export const timeAgo = (date) => {
  const mins = Math.round((Date.now() - new Date(date).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} h ago`;
  return new Date(date).toLocaleDateString();
};

/**
 * Build a payment-modal line from a received M-Pesa payment.
 * If the payment is larger than what the bill still needs, the extra is the
 * `overflow` and the user must say whether it's a tip or a deposit.
 *
 * Line shape: { method: "mpesa", amount, ipn: {id, receipt, payerName, remaining},
 *               overflow: null | { type: "tip"|"deposit", amount, label?, recipientId?, recipientName? } }
 */
export const buildIpnLine = (txn, amountToCover, overflowChoice = null) => {
  const amount = round2(Math.min(txn.remaining, amountToCover));
  const extra = round2(txn.remaining - amount);
  return {
    method: "mpesa",
    amount,
    ipn: { id: txn.id, receipt: txn.receipt, payerName: txn.payerName, remaining: txn.remaining },
    overflow: extra > 0 && overflowChoice ? { ...overflowChoice, amount: extra } : null,
  };
};

/**
 * Submit payment-modal lines for a bill.
 *  1. Lines backed by a KCB notification → /mpesa/.../allocate (confirmed at once,
 *     plus tip / deposit for any overpayment).
 *  2. Remaining cash / manual M-Pesa lines → /payments (existing approval flow).
 *
 * If step 2 fails after step 1 succeeded, the thrown error has
 * `mpesaApplied = true` so the screen can tell the user the M-Pesa part is done.
 *
 * @returns {{ balanceDue: number|null, allocations: object[], payment: object|null, onlyIpn: boolean }}
 */
export async function submitBillPayments(bill, lines) {
  const ipnLines = lines.filter((l) => l.ipn);
  const otherLines = lines.filter((l) => !l.ipn).map(({ method, amount }) => ({ method, amount }));

  const allocations = [];
  for (const line of ipnLines) {
    const reqLines = [{ type: "bill", billId: bill.id, amount: line.amount }];
    if (line.overflow?.type === "tip") {
      reqLines.push({
        type: "tip",
        billId: bill.id,
        recipientId: line.overflow.recipientId,
        amount: line.overflow.amount,
      });
    }
    const depositLabel =
      line.overflow?.type === "deposit"
        ? line.overflow.label?.trim() || bill.customer_name || "Deposit"
        : undefined;
    allocations.push(await MpesaService.allocate(line.ipn.id, { lines: reqLines, depositLabel }));
  }

  let payment = null;
  if (otherLines.length) {
    try {
      const { data } = await PaymentService.process({ billId: bill.id, payments: otherLines });
      payment = data;
    } catch (err) {
      if (allocations.length) err.mpesaApplied = true;
      throw err;
    }
  }

  const lastBill = allocations.at(-1)?.bills?.find((b) => b.bill_id === bill.id);
  const balanceDue = payment?.balance_due ?? (lastBill ? Number(lastBill.balance_due) : null);

  return { balanceDue, allocations, payment, onlyIpn: otherLines.length === 0 };
}
