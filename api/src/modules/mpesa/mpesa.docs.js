/**
 * @swagger
 * tags:
 *   name: M-Pesa
 *   description: Match received KCB M-Pesa notifications to bills (tips, deposits, reversals)
 */

/**
 * @swagger
 * /mpesa/transactions:
 *   get:
 *     summary: List received M-Pesa payments
 *     description: Phone numbers are masked unless the user has manage_mpesa. With billId, each item has a match score for that bill and the list is ordered best match first.
 *     tags: [M-Pesa]
 *     parameters:
 *       - { in: query, name: status, schema: { type: string, enum: [open, unallocated, partially_allocated, allocated, all], default: open } }
 *       - { in: query, name: billId, schema: { type: string, format: uuid } }
 *       - { in: query, name: from, schema: { type: string, format: date } }
 *       - { in: query, name: to, schema: { type: string, format: date } }
 *       - { in: query, name: q, schema: { type: string }, description: receipt, payer name, phone, reference or deposit label }
 *       - { in: query, name: limit, schema: { type: integer, default: 100, maximum: 500 } }
 *     responses:
 *       200: { description: List of payments }
 *
 * /mpesa/transactions/{id}:
 *   get:
 *     summary: One M-Pesa payment with its allocations
 *     tags: [M-Pesa]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string, format: uuid } }
 *     responses:
 *       200: { description: Payment detail }
 *       404: { description: Not found }
 *
 * /mpesa/transactions/{id}/suggestions:
 *   get:
 *     summary: Payable bills ranked by how well they match this payment
 *     tags: [M-Pesa]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string, format: uuid } }
 *     responses:
 *       200: { description: Ranked bills with match reasons }
 *
 * /mpesa/transactions/{id}/allocate:
 *   post:
 *     summary: Match an M-Pesa payment to bills, a tip, and/or mark the rest as a deposit
 *     description: |
 *       Bill lines create confirmed M-Pesa payments (no approval step) and complete the bill when
 *       fully paid. Journals: bill Dr 2300 / Cr 1201; tip Dr 2300 / Cr 2200. A deposit label keeps
 *       the remaining amount on the payment for a later bill. All lines apply atomically.
 *     tags: [M-Pesa]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string, format: uuid } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           example:
 *             lines:
 *               - { type: bill, billId: "0b7c5c8e-1111-4c1e-9b8a-3d1d2f0b9a11", amount: 1200 }
 *               - { type: tip, billId: "0b7c5c8e-1111-4c1e-9b8a-3d1d2f0b9a11", amount: 100 }
 *             depositLabel: "Peter - table 4"
 *     responses:
 *       201: { description: Allocation result with per-bill balances }
 *       409: { description: Over-allocated, exceeds bill balance, or bill not payable }
 *
 * /mpesa/allocations/{id}/reverse:
 *   post:
 *     summary: Reverse a wrong match (manage_mpesa)
 *     description: Voids the payment, posts a reversing journal, reopens the bill and returns the amount to the M-Pesa payment.
 *     tags: [M-Pesa]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string, format: uuid } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           example: { reason: "Matched to wrong table" }
 *     responses:
 *       200: { description: Reversed }
 *       409: { description: Already reversed }
 */
