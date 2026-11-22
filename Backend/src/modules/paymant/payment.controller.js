import { authentication } from "../../middlewares/authentication.js";
import * as paymentService from "./payment.service.js";
import router from "express";
const paymentRouter = router();

/**
 * @openapi
 * /payment/pay:
 *   post:
 *     summary: بدء الدفع الإلكتروني (Paymob) وإنشاء الطلب
 *     description: >
 *       بيحسب المبلغ من الداتابيز (مش من الفرونت)، وبينشئ الطلب بحالة pending،
 *       وبيرجع رابط صفحة الدفع. لو اتصال Paymob فشل الطلب بيتلغي تلقائيًا.
 *     tags: [Payment]
 *     security:
 *       - tokenAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [addressId, items]
 *             properties:
 *               addressId:
 *                 type: integer
 *                 example: 1
 *                 description: لازم يكون عنوان تابع للمستخدم نفسه
 *               items:
 *                 type: array
 *                 minItems: 1
 *                 items:
 *                   type: object
 *                   required: [productId, quantity]
 *                   properties:
 *                     productId: { type: integer, example: 1 }
 *                     quantity: { type: integer, minimum: 1, example: 2 }
 *     responses:
 *       200:
 *         description: تم إنشاء الطلب وإرجاع رابط الدفع
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: Payment key generated successfully }
 *                 orderId: { type: integer, example: 15 }
 *                 paymentUrl:
 *                   type: string
 *                   example: https://accept.paymob.com/api/acceptance/iframes/12345?payment_token=xxxx
 *       400:
 *         description: بيانات غير صحيحة (items/addressId ناقصة، كمية غلط، مخزون غير كافي، أو خطأ من Paymob)
 *       401:
 *         description: التوكن غير موجود أو غير صالح
 *       404:
 *         description: العنوان غير موجود أو المستخدم غير موجود
 */
paymentRouter.post("/pay", authentication, paymentService.processOnlinePayment);

/**
 * @openapi
 * /payment/webhook:
 *   post:
 *     summary: Webhook من Paymob (للاستخدام الداخلي من Paymob فقط)
 *     description: >
 *       بتتصل بيه Paymob بعد كل عملية دفع. الحماية بالتوقيع (HMAC) في الـ query،
 *       ومينفعش تجربه من Swagger لأن التوقيع بيتحسب بالـ secret بتاع Paymob.
 *       بيحدّث حالة الطلب والدفع، وبينقص المخزون، وبيمسح المنتجات من السلة.
 *     tags: [Payment]
 *     parameters:
 *       - in: query
 *         name: hmac
 *         required: true
 *         schema: { type: string }
 *         description: توقيع Paymob للتحقق من المصدر
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               obj:
 *                 type: object
 *                 description: بيانات العملية من Paymob (amount_cents, success, pending, order.merchant_order_id, ...)
 *     responses:
 *       200:
 *         description: تم الاستلام
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 received: { type: boolean, example: true }
 *       401:
 *         description: توقيع HMAC غير صحيح
 */
paymentRouter.post("/webhook", paymentService.paymobWebhook);

export default paymentRouter;
