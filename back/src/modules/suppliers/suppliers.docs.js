/**
 * @openapi
 * tags:
 *   - name: Suppliers
 *     description: |
 *       Supplier master data management.
 *
 *       **Purpose:**
 *       - Track vendors and distributors
 *       - Support procurement & inventory sourcing
 *
 *       **Rules:**
 *       - Suppliers are soft-deleted (archived)
 *       - Archived suppliers are hidden from selection
 */

/**
 * @openapi
 * /suppliers:
 *   get:
 *     tags: [Suppliers]
 *     summary: List suppliers
 *     description: |
 *       Returns all active (non-archived) suppliers.
 *
 *       **RBAC:**
 *       - cashier
 *       - manager
 *       - admin
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Suppliers list
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SupplierListResponse'
 */

/**
 * @openapi
 * /suppliers:
 *   post:
 *     tags: [Suppliers]
 *     summary: Create supplier
 *     description: |
 *       Creates a new supplier.
 *
 *       **RBAC:**
 *       - manager
 *       - admin
 *
 *       **Audit:**
 *       - SUPPLIER_CREATED
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateSupplierRequest'
 *     responses:
 *       201:
 *         description: Supplier created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SupplierResponse'
 *       400:
 *         description: Invalid supplier data
 */

/**
 * @openapi
 * /suppliers/{id}:
 *   get:
 *     tags: [Suppliers]
 *     summary: Get supplier by ID
 *     description: |
 *       Returns a supplier by its ID.
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
 *         description: Supplier details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SupplierResponse'
 *       404:
 *         description: Supplier not found
 */

/**
 * @openapi
 * /suppliers/{id}:
 *   patch:
 *     tags: [Suppliers]
 *     summary: Update supplier
 *     description: |
 *       Updates supplier details.
 *
 *       **RBAC:**
 *       - manager
 *       - admin
 *
 *       **Audit:**
 *       - SUPPLIER_UPDATED
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
 *             $ref: '#/components/schemas/UpdateSupplierRequest'
 *     responses:
 *       200:
 *         description: Supplier updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SupplierResponse'
 *       400:
 *         description: No fields to update
 */

/**
 * @openapi
 * /suppliers/{id}:
 *   delete:
 *     tags: [Suppliers]
 *     summary: Archive supplier
 *     description: |
 *       Archives (soft-deletes) a supplier.
 *
 *       **Important:**
 *       - Archived suppliers cannot be used in procurement
 *       - Historical records remain intact
 *
 *       **RBAC:**
 *       - admin
 *
 *       **Audit:**
 *       - SUPPLIER_ARCHIVED
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
 *         description: Supplier archived
 *       404:
 *         description: Supplier not found
 */
