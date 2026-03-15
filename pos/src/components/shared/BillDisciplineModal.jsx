import { AlertTriangle, CheckCircle, Clock, FileText } from "lucide-react";

const BillDisciplineModal = ({ onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-[60]">
      <div className="bg-gray-900/95 backdrop-blur-md border-2 border-yellow-500/40 w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl overflow-hidden flex flex-col shadow-2xl shadow-yellow-500/20">
        {/* Header */}
        <div className="p-6 pb-4 text-center border-b border-yellow-500/20">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-yellow-500/20 rounded-full mb-3">
            <AlertTriangle size={32} className="text-yellow-400" />
          </div>
          <h3 className="text-2xl font-bold text-yellow-400">Welcome Back</h3>
          <p className="text-sm text-gray-400 mt-1">
            Please take a moment to review these reminders
          </p>
        </div>

        {/* Reminder List */}
        <div className="p-6 space-y-4">
          <div className="flex items-start gap-3">
            <FileText size={20} className="text-yellow-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-white font-medium">Post all bills during the day</p>
              <p className="text-sm text-gray-400 mt-0.5">
                Don't leave bills pending — create and post them as orders come in.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <CheckCircle size={20} className="text-green-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-white font-medium">Close bills once payment is received</p>
              <p className="text-sm text-gray-400 mt-0.5">
                Mark bills as completed immediately after receiving payment.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Clock size={20} className="text-blue-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-white font-medium">Review your open bills regularly</p>
              <p className="text-sm text-gray-400 mt-0.5">
                Check for any outstanding bills that need attention before your shift ends.
              </p>
            </div>
          </div>
        </div>

        {/* Dismiss Button */}
        <div className="p-6 pt-2">
          <button
            onClick={onClose}
            className="w-full py-3 bg-yellow-500 hover:bg-yellow-400 text-gray-900 rounded-xl font-bold text-lg transition-colors"
          >
            I Understand
          </button>
        </div>
      </div>
    </div>
  );
};

export default BillDisciplineModal;
