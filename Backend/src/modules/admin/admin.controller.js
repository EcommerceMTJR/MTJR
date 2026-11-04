import { Router } from 'express'
import { roles } from "../../models/user.model.js";
import { authentication } from "../../middlewares/authentication.js";
import * as adminService from "./admin.service.js";
import { authorization } from '../../middlewares/authorization.js';
const adminRouter = Router();

// يسمح للأدمن بس. لو عندك middleware اسمه authorization تقدر تستخدمه بدل ده.


// كل routes الأدمن محمية: لازم token صحيح + role أدمن
adminRouter.use(authentication,authorization(roles.admin));

// Stats
adminRouter.get("/stats", adminService.getStats);

// Orders
adminRouter.get("/orders", adminService.getOrders);
adminRouter.get("/orders/:id", adminService.getOrderById);
adminRouter.patch("/orders/:id/status", adminService.updateOrderStatus);

// Products
adminRouter.get("/products", adminService.getProducts);
adminRouter.post("/products", adminService.createProduct);
adminRouter.patch("/products/:id", adminService.updateProduct);
adminRouter.delete("/products/:id", adminService.deleteProduct);

// Categories
adminRouter.get("/categories", adminService.getCategories);
adminRouter.post("/categories", adminService.createCategory);
adminRouter.patch("/categories/:id", adminService.updateCategory);
adminRouter.delete("/categories/:id", adminService.deleteCategory);

// Users
adminRouter.get("/users", adminService.getUsers);
adminRouter.get("/users/:id", adminService.getUserById);
adminRouter.patch("/users/:id/status", adminService.updateUserStatus);

export default adminRouter;
