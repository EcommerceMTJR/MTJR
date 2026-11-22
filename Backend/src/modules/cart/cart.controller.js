import { Router } from "express";
import { authentication } from "../../middlewares/authentication.js";
import * as cartService from "./cart.service.js";

const cartRouter = Router();

cartRouter.use(authentication);

cartRouter.get("/", cartService.getCart);
cartRouter.post("/items", cartService.addItem);
cartRouter.patch("/items/:itemId", cartService.updateItem);
cartRouter.delete("/items/:itemId", cartService.removeItem);
cartRouter.delete("/", cartService.clearCart);

export default cartRouter;
