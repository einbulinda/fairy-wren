import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { updateProfile, changePin } from "@/services/auth.service";
import { TokenService } from "@/api/token.service";
import { User, KeyRound, Save, Eye, EyeOff } from "lucide-react";
import toast from "react-hot-toast";
import { dateInputCls as inputCls } from "@/utils/constants";

const ProfilePage = () => {
  const { user, refreshUser } = useAuth();

  // Profile form
  const [name, setName] = useState(user.name || "");

  // PIN form
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const profileMutation = useMutation({
    mutationFn: updateProfile,
    onSuccess: (data) => {
      // Update local storage so the header reflects the new name
      const stored = TokenService.getUser();
      if (stored) {
        TokenService.save({
          token: TokenService.getToken(),
          expiry: TokenService.getExpiry(),
          user: { ...stored, name: data.name },
        });
      }
      refreshUser();
      toast.success("Profile updated");
    },
    onError: (err) => {
      const msg = err?.response?.data?.error?.message || err.message;
      toast.error(msg);
    },
  });

  const pinMutation = useMutation({
    mutationFn: changePin,
    onSuccess: () => {
      setCurrentPin("");
      setNewPin("");
      setConfirmPin("");
      toast.success("PIN changed successfully");
    },
    onError: (err) => {
      const msg = err?.response?.data?.error?.message || err.message;
      toast.error(msg);
    },
  });

  const handleProfileSave = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Name is required");
      return;
    }
    if (trimmed === user.name) {
      toast("No changes to save");
      return;
    }
    profileMutation.mutate({ name: trimmed });
  };

  const handlePinChange = () => {
    if (!currentPin) {
      toast.error("Enter your current PIN");
      return;
    }
    if (newPin.length < 4) {
      toast.error("New PIN must be at least 4 digits");
      return;
    }
    if (newPin !== confirmPin) {
      toast.error("New PIN and confirmation do not match");
      return;
    }
    if (currentPin === newPin) {
      toast.error("New PIN must be different from current PIN");
      return;
    }
    pinMutation.mutate({ currentPin, newPin });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Profile details */}
      <div className="bg-surface-800/50 border border-surface-700 rounded-xl p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-primary-600/30 rounded-full flex items-center justify-center">
            <span className="text-lg font-bold text-primary-300">
              {user.name?.charAt(0)?.toUpperCase()}
            </span>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Profile Details</h2>
            <p className="text-sm text-surface-400 capitalize">{user.role}</p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs text-surface-400 font-medium flex items-center gap-1.5">
              <User size={13} /> Display Name
            </label>
            <input
              className={`w-full ${inputCls}`}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-surface-400 font-medium">Role</label>
            <input
              className={`w-full ${inputCls} opacity-60 cursor-not-allowed`}
              value={user.role}
              disabled
            />
            <p className="text-[11px] text-surface-500">Role can only be changed by an owner.</p>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleProfileSave}
            disabled={profileMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-40 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Save size={15} />
            {profileMutation.isPending ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      {/* Change PIN */}
      <div className="bg-surface-800/50 border border-surface-700 rounded-xl p-6 space-y-5">
        <div className="flex items-center gap-2">
          <KeyRound size={18} className="text-primary-400" />
          <h2 className="text-lg font-semibold text-white">Change PIN</h2>
        </div>

        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs text-surface-400 font-medium">Current PIN</label>
            <div className="relative">
              <input
                type={showCurrent ? "text" : "password"}
                className={`w-full ${inputCls} pr-10`}
                value={currentPin}
                onChange={(e) => setCurrentPin(e.target.value)}
                placeholder="Enter current PIN"
                inputMode="numeric"
              />
              <button
                type="button"
                onClick={() => setShowCurrent((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-surface-400 hover:text-white transition-colors"
              >
                {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-surface-400 font-medium">New PIN</label>
            <div className="relative">
              <input
                type={showNew ? "text" : "password"}
                className={`w-full ${inputCls} pr-10`}
                value={newPin}
                onChange={(e) => setNewPin(e.target.value)}
                placeholder="Enter new PIN (min. 4 digits)"
                inputMode="numeric"
              />
              <button
                type="button"
                onClick={() => setShowNew((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-surface-400 hover:text-white transition-colors"
              >
                {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-surface-400 font-medium">Confirm New PIN</label>
            <input
              type="password"
              className={`w-full ${inputCls}`}
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value)}
              placeholder="Re-enter new PIN"
              inputMode="numeric"
            />
            {confirmPin && newPin && confirmPin !== newPin && (
              <p className="text-[11px] text-red-400">PINs do not match</p>
            )}
          </div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={handlePinChange}
            disabled={pinMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-40 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <KeyRound size={15} />
            {pinMutation.isPending ? "Changing..." : "Change PIN"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
