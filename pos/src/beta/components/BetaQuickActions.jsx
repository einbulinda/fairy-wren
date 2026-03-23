import React from "react";
import { Plus, Users, User, RefreshCw, CheckCircle } from "lucide-react";

const BetaQuickActions = ({
  openBillsCount,
  myBillsCount,
  pendingConfirmCount,
  onNewBill,
  onOpenBills,
  onMyBills,
  onRefresh,
  refreshing,
  canAccessConfirm,
}) => {
  return (
    <div className="grid grid-cols-4 gap-2">
      <button
        onClick={onNewBill}
        className="flex flex-col items-center gap-1 p-2 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 rounded-xl transition-all"
      >
        <Plus size={20} />
        <span className="text-xs font-medium">New</span>
      </button>

      <button
        onClick={onOpenBills}
        className="flex flex-col items-center gap-1 p-2 bg-slate-800/50 hover:bg-slate-800 rounded-xl transition-all relative"
      >
        <Users size={20} />
        <span className="text-xs font-medium">Open</span>
        {openBillsCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-pink-500 rounded-full text-xs font-bold flex items-center justify-center">
            {openBillsCount > 9 ? "9+" : openBillsCount}
          </span>
        )}
      </button>

      <button
        onClick={onMyBills}
        className="flex flex-col items-center gap-1 p-2 bg-slate-800/50 hover:bg-slate-800 rounded-xl transition-all relative"
      >
        <User size={20} />
        <span className="text-xs font-medium">Mine</span>
        {myBillsCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-purple-500 rounded-full text-xs font-bold flex items-center justify-center">
            {myBillsCount > 9 ? "9+" : myBillsCount}
          </span>
        )}
      </button>

      <button
        onClick={onRefresh}
        disabled={refreshing}
        className="flex flex-col items-center gap-1 p-2 bg-slate-800/50 hover:bg-slate-800 rounded-xl transition-all disabled:opacity-50"
      >
        <RefreshCw size={20} className={refreshing ? "animate-spin" : ""} />
        <span className="text-xs font-medium">Sync</span>
      </button>

      {/* Pending Confirmations - only for authorized users */}
      {canAccessConfirm && pendingConfirmCount > 0 && (
        <button className="col-span-4 flex items-center justify-center gap-2 p-2 bg-amber-500/20 border border-amber-500/30 text-amber-400 rounded-xl">
          <CheckCircle size={16} />
          <span className="text-sm font-medium">
            {pendingConfirmCount} payment{pendingConfirmCount > 1 ? "s" : ""}{" "}
            awaiting confirmation
          </span>
        </button>
      )}
    </div>
  );
};

export default BetaQuickActions;
