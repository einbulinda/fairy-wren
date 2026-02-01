/**
 * @openapi
 * components:
 *   schemas:
 *
 *     Supplier:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           example: "8b5c0c1a-4f2a-4c7e-9e5a-abcdef123456"
 *         name:
 *           type: string
 *           example: "ABC Wholesalers Ltd"
 *         contact_name:
 *           type: string
 *           nullable: true
 *           example: "John Doe"
 *         phone:
 *           type: string
 *           nullable: true
 *           example: "+254712345678"
 *         email:
 *           type: string
 *           nullable: true
 *           example: "sales@abcwholesalers.com"
 *         address:
 *           type: string
 *           nullable: true
 *           example: "Industrial Area, Nairobi"
 *         archived:
 *           type: boolean
 *           example: false
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *
 *
 *     CreateSupplierRequest:
 *       type: object
 *       required:
 *         - name
 *       properties:
 *         name:
 *           type: string
 *           example: "XYZ Distributors"
 *         contact_name:
 *           type: string
 *           example: "Mary Wanjiku"
 *         phone:
 *           type: string
 *           example: "+254798765432"
 *         email:
 *           type: string
 *           example: "info@xyzdistributors.com"
 *         address:
 *           type: string
 *           example: "Mombasa Road, Nairobi"
 *
 *
 *     UpdateSupplierRequest:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           example: "XYZ Distributors Ltd"
 *         contact_name:
 *           type: string
 *           example: "Mary Wanjiku"
 *         phone:
 *           type: string
 *           example: "+254798765432"
 *         email:
 *           type: string
 *           example: "accounts@xyzdistributors.com"
 *         address:
 *           type: string
 *           example: "Athi River, Machakos"
 *
 *
 *     SupplierResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           $ref: '#/components/schemas/Supplier'
 *
 *
 *     SupplierListResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Supplier'
 */
