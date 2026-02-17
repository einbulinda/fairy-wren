/**
 * @swagger
 * tags:
 *   name: Payments
 *   description: Bill payments processing and reporting
 */

/**
 * @swagger
 * components:
 *   securitySchemes:
 *     BearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *
 *   schemas:
 *     Payment:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         bill_id:
 *           type: string
 *           format: uuid
 *         amount:
 *           type: number
 *           format: float
 *           example: 1500.00
 *         payment_type:
 *           type: string
 *           enum: [cash, mpesa]
 *         status:
 *           type: string
 *           example: confirmed
 *         is_paid:
 *           type: boolean
 *         mpesa_code:
 *           type: string
 *           nullable: true
 *         created_at:
 *           type: string
 *           format: date-time
 *
 *     ProcessPaymentRequest:
 *       type: object
 *       required:
 *         - billId
 *         - amount
 *         - paymentType
 *       properties:
 *         billId:
 *           type: string
 *           format: uuid
 *         amount:
 *           type: number
 *           example: 1000
 *         paymentType:
 *           type: string
 *           enum: [cash, mpesa]
 *         mpesaCode:
 *           type: string
 *           example: QWE123ABC
 *
 *     ApiSuccessResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           nullable: true
 *
 *     ApiErrorResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: false
 *         error:
 *           type: object
 *           properties:
 *             code:
 *               type: string
 *               example: FAILED_TO_PROCESS_PAYMENT
 *             message:
 *               type: string
 *               example: Failed to process payment
 */

/* ======================================================
   PROCESS PAYMENT
   ====================================================== */

/**
 * @swagger
 * /api/v2/payments:
 *   post:
 *     summary: Process a payment against a bill
 *     description: >
 *       Processes a payment using a database RPC.
 *       Handles partial or full settlement depending on bill state.
 *     tags: [Payments]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ProcessPaymentRequest'
 *     responses:
 *       201:
 *         description: Payment processed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiSuccessResponse'
 *       400:
 *         description: Invalid payment data
 *       500:
 *         description: Payment processing failed
 */

/* ======================================================
   LIST PAYMENTS
   ====================================================== */

/**
 * @swagger
 * /api/v2/payments:
 *   get:
 *     summary: List payments
 *     description: >
 *       Returns payments filtered by payment type, date range, and paid status.
 *     tags: [Payments]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [cash, mpesa]
 *         description: Payment type
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date (inclusive)
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date
 *         description: End date (inclusive)
 *       - in: query
 *         name: isPaid
 *         schema:
 *           type: boolean
 *         description: Filter by paid status
 *     responses:
 *       200:
 *         description: List of payments
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiSuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Payment'
 *       500:
 *         description: Failed to fetch payments
 */

/* ======================================================
   BILLS WITH PAYMENTS
   ====================================================== */

/**
 * @swagger
 * /api/v2/payments/bills:
 *   get:
 *     summary: Fetch bills with payments
 *     description: >
 *       Returns bills with their associated payments, rounds, and items.
 *       Used for cashier and reconciliation views.
 *     tags: [Payments]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Bills with payments
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiSuccessResponse'
 *       500:
 *         description: Failed to fetch bills with payments
 */
