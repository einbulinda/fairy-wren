import { AlertCircle } from "lucide-react";

const ConfirmModal = ({
  title = "Confirm Action",
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
  variant = "danger",
}) => {
  const colors = {
    danger: {
      border: "border-red-500/40",
      shadow: "shadow-red-500/20",
      icon: "bg-red-500/20",
      iconText: "text-red-400",
      title: "text-red-400",
      confirm: "bg-red-600 hover:bg-red-500 text-white",
    },
    warning: {
      border: "border-yellow-500/40",
      shadow: "shadow-yellow-500/20",
      icon: "bg-yellow-500/20",
      iconText: "text-yellow-400",
      title: "text-yellow-400",
      confirm: "bg-yellow-500 hover:bg-yellow-400 text-gray-900",
    },
  };

  const c = colors[variant] || colors.danger;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-[60]">
      <div
        className={`bg-gray-900/95 backdrop-blur-md border-2 ${c.border} w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl overflow-hidden flex flex-col shadow-2xl ${c.shadow}`}
      >
        {/* Header */}
        <div className={`p-6 pb-4 text-center border-b ${c.border}`}>
          <div
            className={`inline-flex items-center justify-center w-16 h-16 ${c.icon} rounded-full mb-3`}
          >
            <AlertCircle size={32} className={c.iconText} />
          </div>
          <h3 className={`text-2xl font-bold ${c.title}`}>{title}</h3>
        </div>

        {/* Message */}
        <div className="p-6">
          <p className="text-gray-300 text-center leading-relaxed">{message}</p>
        </div>

        {/* Actions */}
        <div className="p-6 pt-2 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl font-semibold transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 py-3 ${c.confirm} rounded-xl font-bold transition-colors`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
