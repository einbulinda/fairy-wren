/**
 * @openapi
 * tags:
 *   - name: Bills
 *     description: |
 *       Bills and POS ordering rounds.
 *
 *       **Concepts:**
 *       - A Bill represents a commercial transaction
 *       - Items are added incrementally via Rounds
 *       - Inventory is deducted per round
 *       - Bills can only be voided while OPEN
 *
 *       **Inventory & Ledger:**
 *       - Stock is validated before adding a round
 *       - Inventory ledger entries are posted on sale
 *       - Inventory is restored when a bill is voided
 */

/**
 * @openapi
 * /bills:
 *   post:
 *     tags: [Bills]
 *     summary: Create a new bill
 *     description: |
 *       Creates a new bill in OPEN status.
 *
 *       **RBAC:**
 *       - cashier
 *       - manager
 *
 *       **Audit:**
 *       - BILL_CREATED
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateBillRequest'
 *     responses:
 *       201:
 *         description: Bill created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BillResponse'
 */

/**
 * @openapi
 * /bills:
 *   get:
 *     tags: [Bills]
 *     summary: List bills
 *     description: |
 *       Returns a list of bills.
 *
 *       **Filters:**
 *       - status
 *
 *       **RBAC:**
 *       - manager
 *       - admin
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Bills list
 */

/**
 * @openapi
 * /bills/{id}:
 *   get:
 *     tags: [Bills]
 *     summary: Get bill by ID
 *     description: |
 *       Returns a bill with its rounds and items.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Bill with rounds
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BillWithRoundsResponse'
 *       404:
 *         description: Bill not found
 */

/**
 * @openapi
 * /bills/{id}/rounds:
 *   post:
 *     tags: [Bills]
 *     summary: Add a round to a bill
 *     description: |
 *       Adds a new round (ordering wave) to a bill.
 *
 *       **Rules:**
 *       - Bill must be OPEN
 *       - Stock is validated before insertion
 *
 *       **Side Effects:**
 *       - Inventory deducted
 *       - Ledger updated
 *       - Round auto-numbered
 *
 *       **Audit:**
 *       - ROUND_CREATED
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AddRoundRequest'
 *     responses:
 *       201:
 *         description: Round added
 *       409:
 *         description: Insufficient stock
 */

/**
 * @openapi
 * /bills/{id}:
 *   delete:
 *     tags: [Bills]
 *     summary: Void a bill
 *     description: |
 *       Voids an OPEN bill.
 *
 *       **Rules:**
 *       - Only OPEN bills can be voided
 *
 *       **Side Effects:**
 *       - Inventory restored
 *       - Ledger reversed
 *
 *       **Audit:**
 *       - BILL_VOIDED
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       204:
 *         description: Bill voided
 *       409:
 *         description: Bill not open
 */
