/**
 * @swagger
 * tags:
 *   name: KCB Integration
 *   description: Callbacks invoked by KCB Bank (Instant Payment Notifications)
 */

/**
 * @swagger
 * /integrations/kcb/ipn/till:
 *   post:
 *     summary: KCB till Instant Payment Notification (called by KCB)
 *     description: |
 *       KCB posts here when a payment lands on our Vooma / Lipa na KCB till
 *       (incl. M-Pesa via paybill 522533). The body is signed with
 *       SHA256withRSA; the base64 signature is sent in the `Signature` header
 *       and verified with KCB's public key. Repeats of the same
 *       `transactionID` are acknowledged with the same `transactionId`.
 *
 *       On receipt the system posts Dr 1020 KCB Account / Cr 2300 M-Pesa
 *       Unallocated Receipts.
 *     tags: [KCB Integration]
 *     security: []
 *     parameters:
 *       - in: header
 *         name: Signature
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           example:
 *             header:
 *               messageID: "12345"
 *               originatorConversationID: ""
 *               channelCode: "202"
 *               timeStamp: "20251119133100"
 *             requestPayload:
 *               primaryData:
 *                 businessKey: "1234567"
 *                 businessKeyType: "notifyBiller"
 *               additionalData:
 *                 notificationData:
 *                   businessKey: "TABLE 4"
 *                   businessKeyType: "BillReferenceNumber"
 *                   debitMSISDN: "254711000000"
 *                   transactionAmt: "1000"
 *                   transactionDate: "Wed Nov 19 13:30:54 EAT 2025"
 *                   transactionID: "FT25139M3RM6"
 *                   firstName: "PETER"
 *                   middleName: ""
 *                   lastName: ""
 *                   currency: "KES"
 *                   narration: ""
 *                   transactionType: "MPESA"
 *                   balance: "0"
 *     responses:
 *       200:
 *         description: Stored (or already stored). statusCode "0".
 *         content:
 *           application/json:
 *             example:
 *               header:
 *                 messageID: "12345"
 *                 originatorConversationID: ""
 *                 statusCode: "0"
 *                 statusMessage: "Notification received successfully"
 *               responsePayload:
 *                 transactionInfo:
 *                   transactionId: "6f1c1c1e-6a8e-4c1e-9b8a-3d1d2f0b9a11"
 *       400:
 *         description: Payload missing transactionID or a valid amount. statusCode "1".
 *       401:
 *         description: Missing or invalid signature. statusCode "1".
 *       500:
 *         description: Temporary failure; KCB should retry. statusCode "1".
 */
