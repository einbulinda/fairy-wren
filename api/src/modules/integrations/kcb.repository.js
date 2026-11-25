const pool = require("../../config/db");

/**
 * Insert a notification once. KCB retries deliveries, so a repeat of the same
 * transaction_id returns the existing row instead of inserting again.
 *
 * @returns {{ id: string, inserted: boolean }}
 */
exports.insertTransactionIdempotent = async (row) => {
  const { rows } = await pool.query(
    `INSERT INTO mpesa_transactions (
        source, transaction_id, message_id, originator_conversation_id,
        channel_code, business_key, bill_reference, msisdn,
        first_name, middle_name, last_name, amount, currency,
        transaction_type, narration, transaction_date_raw, transaction_at,
        raw_payload, signature_valid
     ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
        $14, $15, $16, $17, $18::jsonb, $19
     )
     ON CONFLICT (transaction_id) DO NOTHING
     RETURNING id`,
    [
      row.source,
      row.transactionId,
      row.messageId,
      row.originatorConversationId,
      row.channelCode,
      row.businessKey,
      row.billReference,
      row.msisdn,
      row.firstName,
      row.middleName,
      row.lastName,
      row.amount,
      row.currency,
      row.transactionType,
      row.narration,
      row.transactionDateRaw,
      row.transactionAt,
      JSON.stringify(row.rawPayload),
      row.signatureValid,
    ],
  );

  if (rows.length) return { id: rows[0].id, inserted: true };

  const existing = await pool.query(
    "SELECT id FROM mpesa_transactions WHERE transaction_id = $1",
    [row.transactionId],
  );
  return { id: existing.rows[0].id, inserted: false };
};

/**
 * Post Dr 1020 KCB / Cr 2300 M-Pesa Unallocated Receipts. Idempotent.
 */
exports.postReceiptJournal = async (txnId) => {
  const { rows } = await pool.query(
    "SELECT post_mpesa_receipt_journal($1) AS journal_id",
    [txnId],
  );
  return rows[0].journal_id;
};
