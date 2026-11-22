import { Router } from "express";
import * as productService from "./product.service.js";

const productRouter = Router();

/**
 * @openapi
 * /product:
 *   get:
 *     summary: قائمة المنتجات (مع فلترة وترتيب وصفحات)
 *     tags: [Products]
 *     parameters:
 *       - { in: query, name: search, schema: { type: string }, description: بحث في العنوان }
 *       - { in: query, name: category, schema: { type: string }, description: slug القسم (يشمل الأقسام الفرعية) }
 *       - { in: query, name: categoryId, schema: { type: integer } }
 *       - { in: query, name: minPrice, schema: { type: number }, description: أقل سعر (بعد الخصم) }
 *       - { in: query, name: maxPrice, schema: { type: number }, description: أعلى سعر (بعد الخصم) }
 *       - { in: query, name: inStock, schema: { type: string, enum: ["true"] }, description: المتوفر فقط }
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [newest, price_asc, price_desc, best_selling, top_rated]
 *           default: newest
 *       - { in: query, name: page, schema: { type: integer, default: 1, minimum: 1 } }
 *       - { in: query, name: limit, schema: { type: integer, default: 12, minimum: 1, maximum: 60 } }
 *     responses:
 *       200:
 *         description: قائمة المنتجات
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page: { type: integer, example: 1 }
 *                     limit: { type: integer, example: 12 }
 *                     total: { type: integer, example: 40 }
 *                     totalPages: { type: integer, example: 4 }
 *                 result:
 *                   type: array
 *                   items: { $ref: "#/components/schemas/Product" }
 */
productRouter.get("/", productService.getProducts);

/**
 * @openapi
 * /product/{slug}:
 *   get:
 *     summary: تفاصيل منتج مع القسم ومنتجات مشابهة
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema: { type: string }
 *         example: iphone-15
 *     responses:
 *       200:
 *         description: تفاصيل المنتج
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 result:
 *                   allOf:
 *                     - $ref: "#/components/schemas/Product"
 *                     - type: object
 *                       properties:
 *                         category:
 *                           type: object
 *                           properties:
 *                             id: { type: integer }
 *                             name: { type: string }
 *                             slug: { type: string }
 *                         related:
 *                           type: array
 *                           items: { $ref: "#/components/schemas/Product" }
 *       404:
 *         description: المنتج غير موجود
 */
productRouter.get("/:slug", productService.getProductBySlug);

export const categoryRouter = Router();

/**
 * @openapi
 * /category:
 *   get:
 *     summary: شجرة الأقسام (رئيسي وفرعي)
 *     tags: [Categories]
 *     responses:
 *       200:
 *         description: شجرة الأقسام
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 result:
 *                   type: array
 *                   items: { $ref: "#/components/schemas/Category" }
 */
categoryRouter.get("/", productService.getCategories);

export default productRouter;
