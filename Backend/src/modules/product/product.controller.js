import { Router } from "express";
import * as productService from "./product.service.js";

const productRouter = Router();
productRouter.get("/", productService.getProducts);
productRouter.get("/:slug", productService.getProductBySlug);

export const categoryRouter = Router();
categoryRouter.get("/", productService.getCategories);

export default productRouter;
