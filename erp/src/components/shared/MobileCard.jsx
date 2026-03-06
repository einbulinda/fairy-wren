/**
 * Mobile-responsive card primitives for table data.
 * Use with `hidden md:block` on desktop tables and `md:hidden` on card lists.
 */

export const MobileCard = ({ children, onClick, className = "" }) => (
  <div
    onClick={onClick}
    className={`bg-surface-800/50 border border-surface-700 rounded-xl p-4 space-y-2 ${onClick ? "cursor-pointer active:bg-surface-700/40" : ""} ${className}`}
  >
    {children}
  </div>
);

export const MobileField = ({ label, children, className = "" }) => (
  <div className={`flex items-center justify-between gap-3 ${className}`}>
    <span className="text-[11px] font-semibold text-surface-400 uppercase tracking-wider shrink-0">
      {label}
    </span>
    <span className="text-sm text-white text-right">{children}</span>
  </div>
);

export const MobileCardList = ({ children, className = "" }) => (
  <div className={`md:hidden space-y-3 p-3 ${className}`}>{children}</div>
);
