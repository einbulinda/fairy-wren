// Centralized Error Formatter
const normalizeError = (error, fallbackMessage) => {
  // Preserve abort/cancel errors so callers can detect them
  if (error.name === "AbortError" || error.name === "CanceledError") {
    return error;
  }
  return error.response?.data || { message: fallbackMessage };
};

export default normalizeError;
