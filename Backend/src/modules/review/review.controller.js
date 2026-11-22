import { Router } from "express";
import { authentication } from "../../middlewares/authentication.js";
import * as reviewService from "./review.service.js";

const reviewRouter = Router();

// عام: أي زائر يقدر يشوف تقييمات منتج
reviewRouter.get("/product/:productId", reviewService.getProductReviews);

// محمي: لازم يوزر مسجل
reviewRouter.post("/", authentication, reviewService.createReview);
reviewRouter.patch("/:id", authentication, reviewService.updateReview);
reviewRouter.delete("/:id", authentication, reviewService.deleteReview);

export default reviewRouter;
