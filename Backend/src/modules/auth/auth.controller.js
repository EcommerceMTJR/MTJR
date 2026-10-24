import Router from "express";
import { roles } from "../../models/user.model.js";
import { authentication } from "../../middlewares/authentication.js";
import { authorization } from "../../middlewares/authorization.js";
import * as authSchema from "./auth.schema.js";
import * as authService from "./auth.service.js";
import validation from "../../middlewares/validation.js";
const authRouter = Router();
authRouter.post("/register", validation(authSchema.registerSchema), authService.register);
authRouter.get("/activate/:token", authService.activeToken);
authRouter.post("/login",validation(authSchema.loginSchema),authService.login)
authRouter.get("/profile", authentication, authService.profile)
authRouter.post("/sendOtp", validation(authSchema.sendOtpSchema), authService.sendOtp)
authRouter.post("/resetPassword", validation(authSchema.resetPasswordSchema), authService.resetPassword)

export default authRouter;
