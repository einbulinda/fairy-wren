import { CreditCard, Banknote } from "lucide-react";

const PaymentTypeBreakdown = ({ data }) => {
  if (data.length === 0) {
    return (
      <div className="py-8 text-center text-gray-400">
        <p>No payment data available</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-linear-to-r from-purple-900/30 to-pink-900/30 backdrop-blur-sm">
          <tr>
            <th className="text-left py-3 px-3 font-semibold text-purple-200 rounded-tl-lg">
              Date
            </th>
            <th className="text-left py-3 px-3 font-semibold text-purple-200">
              Type
            </th>
            <th className="text-right py-3 px-3 font-semibold text-purple-200 rounded-tr-lg">
              Amount
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-purple-500/10">
          {data.map((row, idx) => (
            <tr
              key={idx}
              className={`
                transition-colors duration-200
                ${idx % 2 === 0 ? "bg-gray-900/20" : "bg-gray-900/5"}
                hover:bg-purple-500/10
              `}
            >
              <td className="py-3 px-3 text-gray-300">{row.business_date}</td>
              <td className="py-3 px-3">
                <div className="flex items-center gap-2">
                  {row.payment_type.toLowerCase() === "cash" ? (
                    <Banknote size={16} className="text-green-400" />
                  ) : (
                    <CreditCard size={16} className="text-blue-400" />
                  )}
                  <span className="capitalize text-white font-medium">
                    {row.payment_type}
                  </span>
                </div>
              </td>
              <td className="py-3 px-3 text-right font-mono font-semibold text-white">
                KSh {Number(row.total_amount).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default PaymentTypeBreakdown;
