/**
 * @openapi
 * tags:
 *   - name: Categories
 *     description: |
 *       Product categorization endpoints.
 *
 *       **Purpose:**
 *       - Organize products
 *       - Control visibility in POS and reports
 *
 *       **Rules:**
 *       - Categories are soft-deleted (archived)
 *       - Archived categories are hidden from POS
 */

/**
 * @openapi
 * /categories:
 *   get:
 *     tags: [Categories]
 *     summary: List categories
 *     description: |
 *       Returns all active (non-archived) categories.
 *
 *       **RBAC:**
 *       - cashier
 *       - manager
 *       - admin
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Categories list
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CategoryListResponse'
 */

/**
 * @openapi
 * /categories:
 *   post:
 *     tags: [Categories]
 *     summary: Create a category
 *     description: |
 *       Creates a new product category.
 *
 *       **RBAC:**
 *       - manager
 *       - admin
 *
 *       **Audit:**
 *       - CATEGORY_CREATED
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateCategoryRequest'
 *     responses:
 *       201:
 *         description: Category created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CategoryResponse'
 *       400:
 *         description: Invalid category data
 */

/**
 * @openapi
 * /categories/{id}:
 *   get:
 *     tags: [Categories]
 *     summary: Get category by ID
 *     description: |
 *       Returns a single category by its ID.
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
 *         description: Category details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CategoryResponse'
 *       404:
 *         description: Category not found
 */

/**
 * @openapi
 * /categories/{id}:
 *   patch:
 *     tags: [Categories]
 *     summary: Update category
 *     description: |
 *       Updates category name and/or description.
 *
 *       **RBAC:**
 *       - manager
 *       - admin
 *
 *       **Audit:**
 *       - CATEGORY_UPDATED
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
 *             $ref: '#/components/schemas/UpdateCategoryRequest'
 *     responses:
 *       200:
 *         description: Category updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CategoryResponse'
 *       400:
 *         description: No fields to update
 */

/**
 * @openapi
 * /categories/{id}:
 *   delete:
 *     tags: [Categories]
 *     summary: Archive category
 *     description: |
 *       Archives (soft-deletes) a category.
 *
 *       **Important:**
 *       - Archived categories are hidden from POS
 *       - Products remain linked historically
 *
 *       **RBAC:**
 *       - admin
 *
 *       **Audit:**
 *       - CATEGORY_ARCHIVED
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
 *         description: Category archived
 *       404:
 *         description: Category not found
 */
