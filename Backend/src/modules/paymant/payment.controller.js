
import { authentication } from "../../middlewares/authentication.js";
import * as paymentService from "./payment.service.js"; // نفترض أن ملف الـ Service موجود بجانبه
import router from "express";
const paymentRouter = router();


paymentRouter.post("/pay", authentication,paymentService.processOnlinePayment);
paymentRouter.post("/webhook",paymentService.paymobWebhook);


export default paymentRouter