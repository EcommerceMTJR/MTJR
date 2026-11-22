import { Router } from "express";
import { roles } from "../../models/user.model.js";
import { authentication } from "../../middlewares/authentication.js";
import * as adminService from "./admin.service.js";
import { authorization } from "../../middlewares/authorization.js";
const adminRouter = Router();

// كل routes الأدمن محمية: لازم token صحيح + role أدمن
adminRouter.use(authentication, authorization(roles.admin));

// ==================== Stats ====================
/**
 * @openapi
 * /admin/stats:
 *   get:
 *     summary: إحصائيات لوحة التحكم (إيرادات، طلبات، مستخدمين، مخزون)
 *     tags: [Admin - Stats]
 *     security: [{ tokenAuth: [] }]
 *     responses:
 *       200:
 *         description: الإحصائيات (آخر 30 يوم للمبيعات والمستخدمين الجدد)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 result:
 *                   type: object
 *                   properties:
 *                     revenue: { type: number, example: 25000 }
 *                     paidOrders: { type: integer, example: 40 }
 *                     ordersByStatus: { type: array, items: { type: object } }
 *                     salesLast30Days: { type: array, items: { type: object } }
 *                     users: { type: object, properties: { total: { type: integer }, newLast30Days: { type: integer } } }
 *                     products: { type: object, properties: { total: { type: integer }, lowStock: { type: array, items: { type: object } } } }
 *                     topProducts: { type: array, items: { type: object } }
 *                     recentOrders: { type: array, items: { $ref: "#/components/schemas/Order" } }
 *       401: { $ref: "#/components/responses/Unauthorized" }
 *       403: { $ref: "#/components/responses/Forbidden" }
 */
adminRouter.get("/stats", adminService.getStats);

// ==================== Orders ====================
/**
 * @openapi
 * /admin/orders:
 *   get:
 *     summary: قائمة الطلبات (فلترة وصفحات)
 *     tags: [Admin - Orders]
 *     security: [{ tokenAuth: [] }]
 *     parameters:
 *       - { $ref: "#/components/parameters/Page" }
 *       - { $ref: "#/components/parameters/Limit" }
 *       - { in: query, name: status, schema: { type: string }, description: "حالة الطلب (pending, processing, delivered, cancelled, ...)" }
 *       - { in: query, name: isPaid, schema: { type: string, enum: ["true", "false"] } }
 *       - { in: query, name: userId, schema: { type: integer } }
 *     responses:
 *       200:
 *         description: قائمة الطلبات
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 pagination: { $ref: "#/components/schemas/Pagination" }
 *                 result: { type: array, items: { $ref: "#/components/schemas/Order" } }
 *       400: { description: حالة أو id غير صالح }
 *       401: { $ref: "#/components/responses/Unauthorized" }
 *       403: { $ref: "#/components/responses/Forbidden" }
 */
adminRouter.get("/orders", adminService.getOrders);

/**
 * @openapi
 * /admin/orders/{id}:
 *   get:
 *     summary: تفاصيل طلب (المستخدم، العنوان، الدفع، المنتجات)
 *     tags: [Admin - Orders]
 *     security: [{ tokenAuth: [] }]
 *     parameters:
 *       - { $ref: "#/components/parameters/IdParam" }
 *     responses:
 *       200:
 *         description: تفاصيل الطلب
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 result:
 *                   type: object
 *                   properties:
 *                     order: { $ref: "#/components/schemas/Order" }
 *                     user: { type: object }
 *                     address: { type: object }
 *                     payment: { type: object }
 *                     items: { type: array, items: { type: object } }
 *       400: { description: id غير صالح }
 *       401: { $ref: "#/components/responses/Unauthorized" }
 *       403: { $ref: "#/components/responses/Forbidden" }
 *       404: { $ref: "#/components/responses/NotFound" }
 */
adminRouter.get("/orders/:id", adminService.getOrderById);

/**
 * @openapi
 * /admin/orders/{id}/status:
 *   patch:
 *     summary: تغيير حالة الطلب
 *     description: >
 *       الطلب الملغي أو المسلَّم لا يتغير. طلب الكارت غير المدفوع لا يتغير إلا للإلغاء.
 *       التسليم لطلب كاش بيعلّمه مدفوع. الإلغاء بيرجّع المخزون (لو مدفوع أو كاش).
 *     tags: [Admin - Orders]
 *     security: [{ tokenAuth: [] }]
 *     parameters:
 *       - { $ref: "#/components/parameters/IdParam" }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status: { type: string, example: delivered }
 *     responses:
 *       200:
 *         description: تم التحديث
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: Order status updated }
 *                 result: { $ref: "#/components/schemas/Order" }
 *       400: { description: حالة غير صالحة أو تغيير غير مسموح }
 *       401: { $ref: "#/components/responses/Unauthorized" }
 *       403: { $ref: "#/components/responses/Forbidden" }
 *       404: { $ref: "#/components/responses/NotFound" }
 */
adminRouter.patch("/orders/:id/status", adminService.updateOrderStatus);

// ==================== Products ====================
/**
 * @openapi
 * /admin/products:
 *   get:
 *     summary: قائمة كل المنتجات (شاملة غير المفعّلة)
 *     tags: [Admin - Products]
 *     security: [{ tokenAuth: [] }]
 *     parameters:
 *       - { $ref: "#/components/parameters/Page" }
 *       - { $ref: "#/components/parameters/Limit" }
 *       - { in: query, name: search, schema: { type: string } }
 *       - { in: query, name: categoryId, schema: { type: integer } }
 *       - { in: query, name: isActive, schema: { type: string, enum: ["true", "false"] } }
 *     responses:
 *       200:
 *         description: قائمة المنتجات
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 pagination: { $ref: "#/components/schemas/Pagination" }
 *                 result: { type: array, items: { $ref: "#/components/schemas/Product" } }
 *       401: { $ref: "#/components/responses/Unauthorized" }
 *       403: { $ref: "#/components/responses/Forbidden" }
 *   post:
 *     summary: إنشاء منتج
 *     description: "الحقول المطلوبة: title, description, price, coverImage, categoryId"
 *     tags: [Admin - Products]
 *     security: [{ tokenAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: "#/components/schemas/ProductInput" }
 *     responses:
 *       201:
 *         description: تم إنشاء المنتج
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: Product created }
 *                 result: { $ref: "#/components/schemas/Product" }
 *       400: { description: حقل ناقص أو discountPrice أكبر من أو يساوي price }
 *       401: { $ref: "#/components/responses/Unauthorized" }
 *       403: { $ref: "#/components/responses/Forbidden" }
 *       404: { description: القسم غير موجود }
 *       409: { description: slug مكرر }
 */
adminRouter.get("/products", adminService.getProducts);
adminRouter.post("/products", adminService.createProduct);

/**
 * @openapi
 * /admin/products/{id}:
 *   patch:
 *     summary: تعديل منتج (ابعت الحقول المراد تغييرها فقط)
 *     tags: [Admin - Products]
 *     security: [{ tokenAuth: [] }]
 *     parameters:
 *       - { $ref: "#/components/parameters/IdParam" }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: "#/components/schemas/ProductInput" }
 *     responses:
 *       200:
 *         description: تم التعديل
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: Product updated }
 *                 result: { $ref: "#/components/schemas/Product" }
 *       400: { description: discountPrice غير صالح }
 *       401: { $ref: "#/components/responses/Unauthorized" }
 *       403: { $ref: "#/components/responses/Forbidden" }
 *       404: { description: المنتج أو القسم غير موجود }
 *   delete:
 *     summary: حذف ناعم (تعطيل المنتج isActive=false)
 *     tags: [Admin - Products]
 *     security: [{ tokenAuth: [] }]
 *     parameters:
 *       - { $ref: "#/components/parameters/IdParam" }
 *     responses:
 *       200:
 *         description: تم تعطيل المنتج
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: Product deactivated }
 *       401: { $ref: "#/components/responses/Unauthorized" }
 *       403: { $ref: "#/components/responses/Forbidden" }
 *       404: { $ref: "#/components/responses/NotFound" }
 */
adminRouter.patch("/products/:id", adminService.updateProduct);
adminRouter.delete("/products/:id", adminService.deleteProduct);

// ==================== Categories ====================
/**
 * @openapi
 * /admin/categories:
 *   get:
 *     summary: كل الأقسام (قائمة مسطّحة)
 *     tags: [Admin - Categories]
 *     security: [{ tokenAuth: [] }]
 *     responses:
 *       200:
 *         description: قائمة الأقسام
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 result: { type: array, items: { $ref: "#/components/schemas/Category" } }
 *       401: { $ref: "#/components/responses/Unauthorized" }
 *       403: { $ref: "#/components/responses/Forbidden" }
 *   post:
 *     summary: إنشاء قسم (name مطلوب)
 *     tags: [Admin - Categories]
 *     security: [{ tokenAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: "#/components/schemas/CategoryInput" }
 *     responses:
 *       201:
 *         description: تم إنشاء القسم
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: Category created }
 *                 result: { $ref: "#/components/schemas/Category" }
 *       400: { description: name مطلوب }
 *       401: { $ref: "#/components/responses/Unauthorized" }
 *       403: { $ref: "#/components/responses/Forbidden" }
 *       404: { description: القسم الأب غير موجود }
 *       409: { description: الاسم أو slug مكرر }
 */
adminRouter.get("/categories", adminService.getCategories);
adminRouter.post("/categories", adminService.createCategory);

/**
 * @openapi
 * /admin/categories/{id}:
 *   patch:
 *     summary: تعديل قسم
 *     tags: [Admin - Categories]
 *     security: [{ tokenAuth: [] }]
 *     parameters:
 *       - { $ref: "#/components/parameters/IdParam" }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: "#/components/schemas/CategoryInput" }
 *     responses:
 *       200:
 *         description: تم التعديل
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: Category updated }
 *                 result: { $ref: "#/components/schemas/Category" }
 *       400: { description: القسم لا يمكن أن يكون أبًا لنفسه }
 *       401: { $ref: "#/components/responses/Unauthorized" }
 *       403: { $ref: "#/components/responses/Forbidden" }
 *       404: { description: القسم أو القسم الأب غير موجود }
 *   delete:
 *     summary: حذف قسم (لو مفيهوش منتجات)
 *     tags: [Admin - Categories]
 *     security: [{ tokenAuth: [] }]
 *     parameters:
 *       - { $ref: "#/components/parameters/IdParam" }
 *     responses:
 *       200:
 *         description: تم الحذف
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: Category deleted }
 *       401: { $ref: "#/components/responses/Unauthorized" }
 *       403: { $ref: "#/components/responses/Forbidden" }
 *       404: { $ref: "#/components/responses/NotFound" }
 *       409: { description: القسم فيه منتجات }
 */
adminRouter.patch("/categories/:id", adminService.updateCategory);
adminRouter.delete("/categories/:id", adminService.deleteCategory);

// ==================== Users ====================
/**
 * @openapi
 * /admin/users:
 *   get:
 *     summary: قائمة المستخدمين (من غير password أو phone)
 *     tags: [Admin - Users]
 *     security: [{ tokenAuth: [] }]
 *     parameters:
 *       - { $ref: "#/components/parameters/Page" }
 *       - { $ref: "#/components/parameters/Limit" }
 *       - { in: query, name: role, schema: { type: string } }
 *       - { in: query, name: search, schema: { type: string }, description: "بحث في الإيميل والاسم" }
 *     responses:
 *       200:
 *         description: قائمة المستخدمين
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 pagination: { $ref: "#/components/schemas/Pagination" }
 *                 result: { type: array, items: { $ref: "#/components/schemas/User" } }
 *       401: { $ref: "#/components/responses/Unauthorized" }
 *       403: { $ref: "#/components/responses/Forbidden" }
 */
adminRouter.get("/users", adminService.getUsers);

/**
 * @openapi
 * /admin/users/{id}:
 *   get:
 *     summary: تفاصيل مستخدم مع عدد طلباته وإجمالي ما أنفقه
 *     tags: [Admin - Users]
 *     security: [{ tokenAuth: [] }]
 *     parameters:
 *       - { $ref: "#/components/parameters/IdParam" }
 *     responses:
 *       200:
 *         description: تفاصيل المستخدم
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 result:
 *                   type: object
 *                   properties:
 *                     user: { $ref: "#/components/schemas/User" }
 *                     ordersCount: { type: integer, example: 5 }
 *                     totalSpent: { type: number, example: 4200 }
 *       401: { $ref: "#/components/responses/Unauthorized" }
 *       403: { $ref: "#/components/responses/Forbidden" }
 *       404: { $ref: "#/components/responses/NotFound" }
 */
adminRouter.get("/users/:id", adminService.getUserById);

/**
 * @openapi
 * /admin/users/{id}/status:
 *   patch:
 *     summary: تفعيل أو تعطيل مستخدم
 *     tags: [Admin - Users]
 *     security: [{ tokenAuth: [] }]
 *     parameters:
 *       - { $ref: "#/components/parameters/IdParam" }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [isActive]
 *             properties:
 *               isActive: { type: boolean, example: false }
 *     responses:
 *       200:
 *         description: تم التحديث
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: User deactivated }
 *                 result: { $ref: "#/components/schemas/User" }
 *       400: { description: isActive لازم boolean، أو بتغيّر حالة حسابك أنت }
 *       401: { $ref: "#/components/responses/Unauthorized" }
 *       403: { $ref: "#/components/responses/Forbidden" }
 *       404: { $ref: "#/components/responses/NotFound" }
 */
adminRouter.patch("/users/:id/status", adminService.updateUserStatus);

export default adminRouter;
