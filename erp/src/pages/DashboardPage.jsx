const DashboardPage = () => {
  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {["Revenue", "Expenses", "Net Profit", "Outstanding Payables"].map(
          (label) => (
            <div
              key={label}
              className="bg-surface-800 border border-surface-700 rounded-xl p-5"
            >
              <p className="text-sm text-surface-400 mb-1">{label}</p>
              <p className="text-2xl font-bold text-white">--</p>
            </div>
          ),
        )}
      </div>
      <div className="bg-surface-800 border border-surface-700 rounded-xl p-6">
        <p className="text-surface-400">
          Dashboard charts and analytics will be implemented in Phase 2.
        </p>
      </div>
    </div>
  );
};

export default DashboardPage;