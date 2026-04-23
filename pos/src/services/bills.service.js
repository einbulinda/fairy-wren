import api from "@/api";
import { dedupeRequest } from "@/api/requestCache";
import normalizeError from "@/utils/errorFormatter";

const BASE_PATH = "/bills";

/**
 * Generate cache key for request deduplication
 * @param {string} method - HTTP method
 * @param {string} path - API path
 * @param {Object} params - Query params
 * @returns {string}
 */
const generateCacheKey = (method, path, params = {}) => {
  const paramsKey =
    Object.keys(params).length > 0 ? `:${JSON.stringify(params)}` : "";
  return `${method}:${path}${paramsKey}`;
};

export const BillsService = {
  // GET /bills - with request deduplication
  // Returns { bills: [], pagination: { page, limit, total, totalPages } }
  async list(params = {}, signal) {
    const cacheKey = generateCacheKey("GET", BASE_PATH, params);

    return dedupeRequest(cacheKey, async () => {
      try {
        const { data } = await api.get(BASE_PATH, { params, signal });
        const body = data?.data !== undefined ? data : { data: data };
        return { bills: body.data ?? [], pagination: body.pagination ?? null };
      } catch (error) {
        throw normalizeError(error, "Error fetching bills.");
      }
    }, signal);
  },

  // GET /bills/:id - with request deduplication
  async getById(billId, signal) {
    const cacheKey = generateCacheKey("GET", `${BASE_PATH}/${billId}`);

    return dedupeRequest(cacheKey, async () => {
      try {
        const { data } = await api.get(`${BASE_PATH}/${billId}`, { signal });
        return data?.data ?? data;
      } catch (error) {
        throw normalizeError(error, "Error fetching bill details.");
      }
    }, signal);
  },

  // POST /bills - no deduplication (mutations should always execute)
  async create(payload, signal) {
    try {
      const { data } = await api.post(BASE_PATH, payload, { signal });
      return data?.data ?? data;
    } catch (error) {
      throw normalizeError(error, "Error creating bill.");
    }
  },

  // PATCH /bills/:id/status - no deduplication
  async updateStatus(billId, payload, signal) {
    try {
      const { data } = await api.patch(
        `${BASE_PATH}/${billId}/status`,
        payload,
        { signal },
      );
      return data?.data ?? data;
    } catch (error) {
      throw normalizeError(error, "Error updating bill status.");
    }
  },

  // DELETE /bills/:id - no deduplication
  async void(billId, signal) {
    try {
      const { data } = await api.delete(`${BASE_PATH}/${billId}`, { signal });
      return data?.data ?? data;
    } catch (error) {
      throw normalizeError(error, "Error voiding bill.");
    }
  },

  // GET /bills/my-stats - with request deduplication
  async getMyStats(period = "month", signal) {
    const cacheKey = generateCacheKey("GET", `${BASE_PATH}/my-stats`, {
      period,
    });

    return dedupeRequest(cacheKey, async () => {
      try {
        const { data } = await api.get(`${BASE_PATH}/my-stats`, {
          params: { period },
          signal,
        });
        return data?.data ?? data;
      } catch (error) {
        throw normalizeError(error, "Error fetching bill stats.");
      }
    }, signal);
  },

  // POST /bills/:id/rounds - no deduplication
  async addRound(billId, payload, signal) {
    try {
      const { data } = await api.post(
        `${BASE_PATH}/${billId}/rounds`,
        payload,
        { signal },
      );
      return data?.data ?? data;
    } catch (error) {
      throw normalizeError(error, "Error adding bill round.");
    }
  },

  // POST /bills/:id/exchange - no deduplication
  async exchange(billId, payload, signal) {
    try {
      const { data } = await api.post(`${BASE_PATH}/${billId}/exchange`, payload, { signal });
      return data?.data ?? data;
    } catch (error) {
      throw normalizeError(error, "Error processing item exchange.");
    }
  },

  // POST /bills/:id/pay - no deduplication
  async pay(billId, payload, signal) {
    try {
      const { data } = await api.post(`${BASE_PATH}/${billId}/pay`, payload, {
        signal,
      });
      return data?.data ?? data;
    } catch (error) {
      throw normalizeError(error, "Error processing payment.");
    }
  },
};
