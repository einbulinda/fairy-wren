import { Package } from "lucide-react";

const CategorySalesTable = ({ data }) => {
  if (data.length === 0) {
    return (
      <div className="py-8 text-center text-gray-400">
        <Package size={48} className="mx-auto mb-3 opacity-50" />
        <p>No category data available</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-linear-to-r from-purple-900/30 to-pink-900/30 backdrop-blur-sm">
          <tr>
            <th className="text-left py-3 px-3 font-semibold text-purple-200 rounded-tl-lg">
              Category
            </th>
            <th className="text-right py-3 px-3 font-semibold text-purple-200">
              Qty
            </th>
            <th className="text-right py-3 px-3 font-semibold text-purple-200 rounded-tr-lg">
              Sales
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-purple-500/10">
          {data.map((row, idx) => (
            <tr
              key={row.category_id}
              className={`
                transition-colors duration-200
                ${idx % 2 === 0 ? "bg-gray-900/20" : "bg-gray-900/5"}
                hover:bg-purple-500/10
              `}
            >
              <td className="py-3 px-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-linear-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 flex items-center justify-center">
                    <span className="text-xs font-bold text-purple-300">
                      {row.category_name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className="text-white font-medium">
                    {row.category_name}
                  </span>
                </div>
              </td>
              <td className="py-3 px-3 text-right">
                <span className="px-2 py-1 rounded-lg bg-purple-500/20 border border-purple-500/30 font-mono font-semibold text-purple-300">
                  {row.total_quantity}
                </span>
              </td>
              <td className="py-3 px-3 text-right font-mono font-semibold text-white">
                KSh {Number(row.total_sales).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default CategorySalesTable;
