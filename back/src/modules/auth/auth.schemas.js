/**
 * @openapi
 * components:
 *   schemas:
 *
 *     LoginRequest:
 *       type: object
 *       required:
 *         - pin
 *       properties:
 *         pin:
 *           type: string
 *           description: |
 *             User PIN.
 *             Used only for authentication and never stored or returned.
 *           example: "1234"
 *
 *
 *     AuthenticatedUser:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           example: "b8c9e9b4-1a2b-4d5e-9c77-acde12345678"
 *         name:
 *           type: string
 *           example: "Alice Wanjiru"
 *         role:
 *           type: string
 *           example: "cashier"
 *         active:
 *           type: boolean
 *           example: true
 *
 *
 *     LoginResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           type: object
 *           properties:
 *             token:
 *               type: string
 *               description: JWT access token
 *               example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *             user:
 *               $ref: '#/components/schemas/AuthenticatedUser'
 *
 *
 *     MeResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           $ref: '#/components/schemas/AuthenticatedUser'
 *
 *
 *     ErrorResponse:
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
 *               example: "INVALID_CREDENTIALS"
 *             message:
 *               type: string
 *               example: "Invalid PIN or credentials"
 */
