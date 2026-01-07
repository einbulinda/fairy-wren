import { AlertCircle, Copy } from "lucide-react";
import toast from "react-hot-toast";

const OutstandingBillsTable = ({ data }) => {
  const copyBillId = (billId) => {
    navigator.clipboard.writeText(billId);
    toast.success("Bill ID copied!");
  };

  if (data.length === 0) {
    return (
      <div className="py-8 text-center text-gray-400">
        <AlertCircle
          size={48}
          className="mx-auto mb-3 opacity-50 text-green-400"
        />
        <p className="text-lg font-medium text-green-400">All bills settled!</p>
        <p className="text-sm mt-1">No outstanding payments</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-linear-to-r from-purple-900/30 to-pink-900/30 backdrop-blur-sm">
          <tr>
            <th className="text-left py-3 px-3 font-semibold text-purple-200 rounded-tl-lg">
              Bill ID
            </th>
            <th className="text-right py-3 px-3 font-semibold text-purple-200">
              Total
            </th>
            <th className="text-right py-3 px-3 font-semibold text-purple-200">
              Paid
            </th>
            <th className="text-right py-3 px-3 font-semibold text-purple-200 rounded-tr-lg">
              Outstanding
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-purple-500/10">
          {data.map((row, idx) => (
            <tr
              key={row.bill_id}
              className={`
                transition-colors duration-200
                ${idx % 2 === 0 ? "bg-gray-900/20" : "bg-gray-900/5"}
                hover:bg-purple-500/10
              `}
            >
              <td className="py-3 px-3">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-gray-300 text-xs">
                    {row.bill_id.slice(0, 8)}...
                  </span>
                  <button
                    onClick={() => copyBillId(row.bill_id)}
                    className="p-1 rounded hover:bg-purple-500/20 transition-colors"
                    title="Copy full Bill ID"
                  >
                    <Copy size={14} className="text-purple-400" />
                  </button>
                </div>
              </td>
              <td className="py-3 px-3 text-right font-mono text-white">
                KSh {Number(row.bill_total).toLocaleString()}
              </td>
              <td className="py-3 px-3 text-right font-mono text-green-400">
                KSh {Number(row.paid_amount).toLocaleString()}
              </td>
              <td className="py-3 px-3 text-right">
                <span className="px-2 py-1 rounded-lg bg-red-500/20 border border-red-500/30 font-mono font-semibold text-red-300">
                  KSh {Number(row.outstanding_amount).toLocaleString()}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default OutstandingBillsTable;
