import api from "@/api";

export const fetchBills = async (params = {}) => {
  const limit = 100;
  let page = 1;
  let allBills = [];

  // Fetch all pages so client-side stats cover the full date range
  while (true) {
    const { data } = await api.get("/bills", {
      params: { ...params, page, limit },
    });
    const bills = data.data ?? [];
    allBills = allBills.concat(bills);
    const totalPages = data.pagination?.totalPages ?? 1;
    if (page >= totalPages) break;
    page++;
  }

  return { bills: allBills };
};
