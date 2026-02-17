/**
 * @openapi
 * components:
 *   schemas:
 *
 *     Category:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           example: "9c2c2e6e-3f4b-4b6f-bc9e-123456789abc"
 *         name:
 *           type: string
 *           example: "Beverages"
 *         description:
 *           type: string
 *           nullable: true
 *           example: "Soft drinks, juices, and water"
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
 *     CreateCategoryRequest:
 *       type: object
 *       required:
 *         - name
 *       properties:
 *         name:
 *           type: string
 *           example: "Snacks"
 *         description:
 *           type: string
 *           example: "Quick bites and packaged snacks"
 *
 *
 *     UpdateCategoryRequest:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           example: "Hot Drinks"
 *         description:
 *           type: string
 *           example: "Tea, coffee, and hot beverages"
 *
 *
 *     CategoryResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           $ref: '#/components/schemas/Category'
 *
 *
 *     CategoryListResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Category'
 */
