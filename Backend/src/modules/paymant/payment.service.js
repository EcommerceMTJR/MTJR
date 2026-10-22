import axios from "axios";
import dotenv from "dotenv";
dotenv.config();
import asyncHandler from "../../middlewares/asyncHandler.js";

// ==================== 1. SERVICES ====================

// 1. الحصول على الـ Auth Token
export const getPaymentAuthToken = async () => {
    const response = await axios.post("https://accept.paymob.com/api/auth/tokens", {
        api_key: process.env.PAYMOB_API_KEY,
    });
    if (!response || !response.data.token) {
        throwError("Error in getPaymentAuthToken, Paymob Authentication failed", 400);
    }
    return response.data.token;
};

// 2. تسجيل الطلب
export const createPaymentOrder = async (authToken, amountCents, items) => {
    const response = await axios.post("https://accept.paymob.com/api/ecommerce/orders", {
        auth_token: authToken,
        delivery_needed: false,
        amount_cents: amountCents,
        currency: "EGP",
        items: items,
    });

    if (!response || !response.data.id) {
        throwError("Paymob Order registration failed", 400);
    }

    return response.data.id;
};

// 3. طلب مفتاح الدفع (Payment Key)
export const getPaymentKey = async (authToken, paymobOrderId, amountCents, billingData) => {
    const response = await axios.post("https://accept.paymob.com/api/acceptance/payment_keys", {
        auth_token: authToken,
        amount_cents: amountCents,
        expiration: 3600,
        order_id: paymobOrderId,
        billing_data: {
            apartment: "NA",
            email: billingData.email,
            floor: "NA",
            first_name: billingData.firstName,
            street: "NA",
            building: "NA",
            phone_number: billingData.phone,
            shipping_method: "NA",
            postal_code: "NA",
            city: "NA",
            country: "EG",
            last_name: billingData.lastName,
            state: "NA",
        },
        currency: "EGP",
        integration_id: parseInt(process.env.PAYMOB_INTEGRATION_ID),
    });

    if (!response || !response.data.token) {
        throwError("Paymob Payment Key failed", 400);
    }

    return response.data.token;
};

// ==================== 2. CONTROLLERS ====================

// دالة بدء عملية الدفع وتوليد الرابط
export const processOnlinePayment = asyncHandler(async (req, res, next) => {
    const { amount, items, billingData } = req.body;

    // الخطوة الأولى: الحصول على الـ Auth Token
    const authToken = await getPaymentAuthToken();

    // الخطوة الثانية: تسجيل الطلب لدى Paymob
    const amountCents = Math.round(amount * 100);
    const paymobOrderId = await createPaymentOrder(authToken, amountCents, items);

    // الخطوة الثالثة: طلب مفتاح الدفع
    const paymentKey = await getPaymentKey(authToken, paymobOrderId, amountCents, billingData);

    // الخطوة الرابعة: بناء رابط الـ Iframe
    const iframeId = process.env.PAYMOB_IFRAME_ID;
    const paymentUrl = `https://accept.paymob.com/api/acceptance/iframes/${iframeId}?payment_token=${paymentKey}`;

    return res.status(200).json({
        success: true,
        message: "Payment key generated successfully",
        paymentKey,
        paymentUrl,
    });
});

// دالة استقبال إشعارات الـ Webhook من Paymob بعد الدفع
export const paymobWebhook = asyncHandler(async (req, res, next) => {
    const orgData = req.body;
    const transaction = orgData.obj;

    if (transaction.success === true) {
        const paymobOrderId = transaction.order.id;
        const amountPaid = transaction.amount_cents / 100;

        // هنا يمكنك تحديث حالة الطلب في قاعدة البيانات لديك (مثلاً Order.update({ status: 'paid' }))
        console.log(`Order ${paymobOrderId} paid successfully with amount ${amountPaid}`);
    } else {
        console.log("Payment failed or pending");
    }

    return res.status(200).json({ received: true });
});
