const categoriesService = require("../categories/categories.service");
const productsService = require("../products/products.service");
const billsService = require("../bills/bills.service");
const paymentsService = require("../payments/payments.service");

exports.getBootstrapData = async () => {
  /**
   * Parallel reads for speed
   * No shared state
   */
  const [categories, products, bills, payments] = await Promise.all([
    categoriesService.list(),
    productsService.list({ active: true }),
    billsService.listBills({ status: "open" }),
    paymentsService.listPayments(),
  ]);

  return {
    categories,
    products,
    bills,
    payments,
  };
};
