import { Router } from "express";
import { authentication } from "../../middlewares/authentication.js";
import * as orderService from "./order.service.js";

const orderRouter = Router();

orderRouter.use(authentication);

orderRouter.post("/checkout", orderService.checkout);
orderRouter.get("/", orderService.getMyOrders);
orderRouter.get("/:id", orderService.getMyOrderById);
orderRouter.patch("/:id/cancel", orderService.cancelMyOrder);

export default orderRouter;
