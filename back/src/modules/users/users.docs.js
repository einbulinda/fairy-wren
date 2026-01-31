/**
 * @openapi
 * tags:
 *   - name: Users
 *     description: |
 *       Staff user management (v2).
 *
 *       **RBAC rules:**
 *       - Only authenticated users may access these endpoints
 *       - Role changes and status updates are restricted to Admins
 *       - PINs are never returned or stored in plain text
 */

/**
 * @openapi
 * /users:
 *   get:
 *     tags: [Users]
 *     summary: List staff users
 *     description: |
 *       Returns a list of staff users.
 *
 *       **RBAC:**
 *       - Admin: allowed
 *       - Manager: allowed
 *       - Cashier: forbidden
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of users
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserListResponse'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */

/**
 * @openapi
 * /users:
 *   post:
 *     tags: [Users]
 *     summary: Create a staff user
 *     description: |
 *       Creates a new staff user.
 *
 *       **RBAC:**
 *       - Admin: allowed
 *       - Manager: forbidden
 *       - Cashier: forbidden
 *
 *       **Security Notes:**
 *       - PIN is accepted only during creation
 *       - PIN is hashed and fingerprinted
 *       - PIN is never returned
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateUser'
 *     responses:
 *       201:
 *         description: User created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserResponse'
 *       400:
 *         description: Invalid user data
 *       409:
 *         description: PIN already in use
 */

/**
 * @openapi
 * /users/{userId}:
 *   get:
 *     tags: [Users]
 *     summary: Get a user profile
 *     description: |
 *       Retrieves a staff user profile by ID.
 *
 *       **RBAC:**
 *       - Admin: allowed
 *       - Manager: allowed
 *       - Cashier: allowed (self only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User profile
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserResponse'
 *       404:
 *         description: User not found
 */

/**
 * @openapi
 * /users/{userId}:
 *   put:
 *     tags: [Users]
 *     summary: Update user profile
 *     description: |
 *       Updates a user’s profile information.
 *
 *       **RBAC:**
 *       - Admin: allowed
 *       - Manager: allowed
 *       - Cashier: allowed (self only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateUser'
 *     responses:
 *       200:
 *         description: User updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserResponse'
 *       400:
 *         description: No fields to update
 */

/**
 * @openapi
 * /users/{userId}/status:
 *   patch:
 *     tags: [Users]
 *     summary: Activate or deactivate a user
 *     description: |
 *       Activates or deactivates a user account.
 *
 *       **RBAC:**
 *       - Admin: allowed
 *       - Manager: forbidden
 *       - Cashier: forbidden
 *
 *       **Audit:**
 *       - Action is recorded as USER_STATUS_CHANGED
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateUserStatus'
 *     responses:
 *       200:
 *         description: User status updated
 *       403:
 *         description: Forbidden
 */

/**
 * @openapi
 * /users/{userId}/role:
 *   patch:
 *     tags: [Users]
 *     summary: Change a user’s role
 *     description: |
 *       Changes a user’s role.
 *
 *       **RBAC:**
 *       - Admin: allowed
 *       - Manager: forbidden
 *       - Cashier: forbidden
 *
 *       **Audit:**
 *       - Action is recorded as USER_ROLE_CHANGED
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateUserRole'
 *     responses:
 *       200:
 *         description: User role updated
 *       403:
 *         description: Forbidden
 */

/**
 * @openapi
 * /users/{userId}:
 *   delete:
 *     tags: [Users]
 *     summary: Archive a user
 *     description: |
 *       Archives (soft deletes) a user account.
 *
 *       **RBAC:**
 *       - Admin: allowed
 *       - Manager: forbidden
 *       - Cashier: forbidden
 *
 *       **Audit:**
 *       - Action is recorded as USER_ARCHIVED
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: User archived successfully
 *       403:
 *         description: Forbidden
 */
