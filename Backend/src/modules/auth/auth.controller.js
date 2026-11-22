import Router from "express";
import { roles } from "../../models/user.model.js";
import { authentication } from "../../middlewares/authentication.js";
import { authorization } from "../../middlewares/authorization.js";
import * as authSchema from "./auth.schema.js";
import * as authService from "./auth.service.js";
import validation from "../../middlewares/validation.js";
const authRouter = Router();
/**
 * @openapi
 * /auth/register:
 *   post:
 *     summary: تسجيل مستخدم جديد
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               email: { type: string }
 *               password: { type: string }
 *     responses:
 *       201: { description: تم التسجيل }
 */
authRouter.post("/register", validation(authSchema.registerSchema), authService.register);
/**
 * @openapi
 * /auth/activate/{token}:
 *   get:
 *     summary: تفعيل الحساب
 *     tags: [Auth]
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: تم تفعيل الحساب }
 *       400: { description: توكن غير صالح }
 */
authRouter.get("/activate/:token", authService.activeToken);
/**
 * @openapi
 * /auth/login:
 *   post:
 *     summary: تسجيل الدخول
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, example: ahmed@mail.com }
 *               password: { type: string, example: "123456" }
 *     responses:
 *       200: { description: تم تسجيل الدخول وإرجاع التوكن }
 *       401: { description: بيانات غير صحيحة }
 */
authRouter.post("/login", validation(authSchema.loginSchema), authService.login)
/**
 * @openapi
 * /auth/profile:
 *   get:
 *     summary: بيانات المستخدم الحالي
 *     tags: [Auth]
 *     security:
 *       - tokenAuth: []
 *     responses:
 *       200: { description: بيانات المستخدم }
 *       401: { description: غير مصرح }
 */
authRouter.get("/profile", authentication, authService.profile)
/**
 * @openapi
 * /auth/sendOtp:
 *   post:
 *     summary: إرسال كود OTP على الإيميل
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: string, example: ahmed@mail.com }
 *     responses:
 *       200: { description: تم إرسال الكود }
 *       404: { description: المستخدم غير موجود }
 */
authRouter.post("/sendOtp", validation(authSchema.sendOtpSchema), authService.sendOtp)
/**
 * @openapi
 * /auth/resetPassword:
 *   post:
 *     summary: إعادة تعيين كلمة المرور
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, otp, newPassword]
 *             properties:
 *               email: { type: string }
 *               otp: { type: string, example: "123456" }
 *               newPassword: { type: string }
 *     responses:
 *       200: { description: تم تغيير كلمة المرور }
 *       400: { description: كود غير صحيح أو منتهي }
 */
authRouter.post("/resetPassword", validation(authSchema.resetPasswordSchema), authService.resetPassword)

export default authRouter;
