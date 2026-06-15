const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

// userId → { count: number, lockedUntil: number | null }
const state = new Map();

exports.isLocked = (userId) => {
  const entry = state.get(userId);
  if (!entry?.lockedUntil) return false;
  if (Date.now() >= entry.lockedUntil) {
    state.delete(userId);
    return false;
  }
  return true;
};

// Returns remaining lock duration in seconds (0 if not locked).
exports.remainingLockSecs = (userId) => {
  const entry = state.get(userId);
  if (!entry?.lockedUntil) return 0;
  return Math.max(0, Math.ceil((entry.lockedUntil - Date.now()) / 1000));
};

exports.recordFailure = (userId) => {
  const entry = state.get(userId) ?? { count: 0, lockedUntil: null };
  entry.count += 1;
  if (entry.count >= MAX_ATTEMPTS) {
    entry.lockedUntil = Date.now() + WINDOW_MS;
  }
  state.set(userId, entry);
};

exports.clearFailures = (userId) => {
  state.delete(userId);
};
