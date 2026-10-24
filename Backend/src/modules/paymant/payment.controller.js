import asyncHandler from "../../middlewares/asyncHandler.js";
import * as paymentService from "./payment.service.js"; // نفترض أن ملف الـ Service موجود بجانبه
import router from "express";
const paymentrouter = router();


paymentrouter.post("/pay", paymentService.processOnlinePayment);
paymentrouter.post("/webhook",paymentService.paymobWebhook);
