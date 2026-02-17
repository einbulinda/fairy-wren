// Centralized Error Formatter
const normalizeError = (error, fallbackMessage) => {
  return error.response?.data || { message: fallbackMessage };
};

export default normalizeError;
