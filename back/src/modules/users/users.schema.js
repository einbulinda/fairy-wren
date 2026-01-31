/**
 * @openapi
 * components:
 *   schemas:
 *
 *     User:
 *       type: object
 *       description: Staff user profile
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
 *         mobile:
 *           type: string
 *           nullable: true
 *           example: "0712345678"
 *         active:
 *           type: boolean
 *           example: true
 *         created_at:
 *           type: string
 *           format: date-time
 *           example: "2026-01-20T10:15:30Z"
 *
 *
 *     CreateUser:
 *       type: object
 *       description: Payload to create a staff user
 *       required:
 *         - name
 *         - pin
 *         - role
 *       properties:
 *         name:
 *           type: string
 *           example: "Alice Wanjiru"
 *         pin:
 *           type: string
 *           description: |
 *             Plain PIN used only during creation.
 *             Never stored or returned by the API.
 *           example: "1234"
 *         role:
 *           type: string
 *           example: "cashier"
 *         mobile:
 *           type: string
 *           nullable: true
 *           example: "0712345678"
 *
 *
 *     UpdateUser:
 *       type: object
 *       description: Payload to update a user profile
 *       properties:
 *         name:
 *           type: string
 *           example: "Alice Wanjiru"
 *         mobile:
 *           type: string
 *           nullable: true
 *           example: "0712345678"
 *
 *
 *     UpdateUserStatus:
 *       type: object
 *       description: Activate or deactivate a user account
 *       required:
 *         - active
 *       properties:
 *         active:
 *           type: boolean
 *           example: false
 *
 *
 *     UpdateUserRole:
 *       type: object
 *       description: Change a user's role (admin only)
 *       required:
 *         - role
 *       properties:
 *         role:
 *           type: string
 *           example: "manager"
 *
 *
 *     UserResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           $ref: '#/components/schemas/User'
 *
 *
 *     UserListResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/User'
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
 *               example: "PIN_ALREADY_IN_USE"
 *             message:
 *               type: string
 *               example: "PIN already in use"
 */
