/**
 * @openapi
 * tags:
 *   - name: Auth
 *     description: |
 *       Authentication endpoints (v2).
 *
 *       **Security model:**
 *       - PIN-based authentication for staff users
 *       - JWT bearer tokens
 *       - Stateless sessions (POS-friendly)
 *
 *       **Important:**
 *       - PINs are never stored or returned
 *       - Same error is returned for invalid PIN or user
 *       - All login attempts are audit-logged
 */

/**
 * @openapi
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Authenticate user using PIN
 *     description: |
 *       Authenticates a staff user using their PIN.
 *
 *       **Security Notes:**
 *       - Uses deterministic PIN fingerprinting
 *       - Uses bcrypt hash comparison
 *       - Prevents user enumeration by returning a generic error
 *
 *       **Audit:**
 *       - LOGIN_SUCCESS on success
 *       - LOGIN_FAILED on failure
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Invalid credentials
 */

/**
 * @openapi
 * /auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Get current authenticated user
 *     description: |
 *       Returns the currently authenticated user.
 *
 *       **RBAC:**
 *       - Any authenticated role (Admin, Manager, Cashier)
 *
 *       **Security:**
 *       - Requires a valid JWT bearer token
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Authenticated user profile
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MeResponse'
 *       401:
 *         description: Unauthorized
 */

/**
 * @openapi
 * /auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Logout current session
 *     description: |
 *       Logs out the current user.
 *
 *       **Implementation Note:**
 *       - Stateless JWT logout
 *       - Client should discard token
 *
 *       **RBAC:**
 *       - Any authenticated role
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       204:
 *         description: Logged out successfully
 */
