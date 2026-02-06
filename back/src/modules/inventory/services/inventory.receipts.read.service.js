const repo = require("../repos/inventory.receipts.read.repository");

exports.listReceipts = async () => {
  const { data, error } = await repo.listReceipts();
  if (error) throw new Error("FAILED_TO_FETCH_RECEIPTS");
  return data;
};

exports.getReceiptById = async (id) => {
  const { data, error } = await repo.getReceiptById(id);
  if (error || !data) throw new Error("RECEIPT_NOT_FOUND");
  return data;
};
