/**
 * @openapi
 * components:
 *   schemas:
 *     CreateProduct:
 *       type: object
 *       required: [name, price]
 *       properties:
 *         name:
 *           type: string
 *           example: Tusker
 *         price:
 *           type: number
 *           example: 250
 *         category_id:
 *           type: string
 *           example: c-001
 *
 *     UpdateProduct:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *         price:
 *           type: number
 *         category_id:
 *           type: string
 *         active:
 *           type: boolean
 *
 *     Product:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         name:
 *           type: string
 *         price:
 *           type: number
 *         active:
 *           type: boolean
 *
 *     ProductResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         data:
 *           $ref: '#/components/schemas/Product'
 *
 *     ProductListResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         data:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Product'
 */
