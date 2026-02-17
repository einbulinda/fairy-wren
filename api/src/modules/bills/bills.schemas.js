/**
 * @openapi
 * components:
 *   schemas:
 *
 *     Bill:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         customer_name:
 *           type: string
 *           nullable: true
 *         status:
 *           type: string
 *           enum: [open, void, awaiting_confirmation, completed, cancelled]
 *         subtotal:
 *           type: number
 *           format: decimal
 *         tax:
 *           type: number
 *           format: decimal
 *         total:
 *           type: number
 *           format: decimal
 *         created_at:
 *           type: string
 *           format: date-time
 *
 *
 *     RoundItem:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         product_id:
 *           type: string
 *           format: uuid
 *         quantity:
 *           type: integer
 *           example: 2
 *         price:
 *           type: number
 *           format: decimal
 *           example: 450
 *
 *
 *     Round:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         round_number:
 *           type: integer
 *           example: 1
 *         created_at:
 *           type: string
 *           format: date-time
 *         round_items:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/RoundItem'
 *
 *
 *     CreateBillRequest:
 *       type: object
 *       properties:
 *         customer_name:
 *           type: string
 *           example: "Walk-in Customer"
 *
 *
 *     AddRoundRequest:
 *       type: object
 *       required:
 *         - items
 *       properties:
 *         items:
 *           type: array
 *           minItems: 1
 *           items:
 *             type: object
 *             required: [product_id, quantity, price]
 *             properties:
 *               product_id:
 *                 type: string
 *                 format: uuid
 *               quantity:
 *                 type: integer
 *                 minimum: 1
 *               price:
 *                 type: number
 *                 format: decimal
 *
 *
 *     BillResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         data:
 *           $ref: '#/components/schemas/Bill'
 *
 *
 *     BillWithRoundsResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         data:
 *           allOf:
 *             - $ref: '#/components/schemas/Bill'
 *             - type: object
 *               properties:
 *                 rounds:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Round'
 */
