import { Router } from "express";
import { authentication } from "../../middlewares/authentication.js";
import * as addressService from "./address.service.js";

const addressRouter = Router();

// كل العناوين خاصة باليوزر المسجل
addressRouter.use(authentication);

addressRouter.get("/", addressService.getAddresses);
addressRouter.post("/", addressService.createAddress);
addressRouter.patch("/:id", addressService.updateAddress);
addressRouter.delete("/:id", addressService.deleteAddress);

export default addressRouter;
