import axios from "axios";
import crypto from "crypto";
import CryptoJS from "crypto-js";
import asyncHandler from "../../middlewares/asyncHandler.js";
import { throwError } from "../../utils/helperFunction.js";
import Product from "../../models/Product.js"

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
export const createPaymentOrder = async (authToken, amountCents, items, merchantOrderId) => {
    const response = await axios.post("https://accept.paymob.com/api/ecommerce/orders", {
        auth_token: authToken,
        delivery_needed: false,
        amount_cents: amountCents,
        currency: "EGP",
        merchant_order_id: merchantOrderId,
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

// 4. التحقق من توقيع Paymob (HMAC)
const verifyPaymobHmac = (obj, receivedHmac) => {
    if (!obj || !receivedHmac) return false;

    const fields = [
        obj.amount_cents,
        obj.created_at,
        obj.currency,
        obj.error_occured,
        obj.has_parent_transaction,
        obj.id,
        obj.integration_id,
        obj.is_3d_secure,
        obj.is_auth,
        obj.is_capture,
        obj.is_refunded,
        obj.is_standalone_payment,
        obj.is_voided,
        obj.order?.id,
        obj.owner,
        obj.pending,
        obj.source_data?.pan,
        obj.source_data?.sub_type,
        obj.source_data?.type,
        obj.success,
    ];

    const calculated = crypto.createHmac("sha512", process.env.PAYMOB_HMAC_SECRET).update(fields.join("")).digest("hex");

    const a = Buffer.from(calculated);
    const b = Buffer.from(String(receivedHmac));
    return a.length === b.length && crypto.timingSafeEqual(a, b);
};

// ==================== 2. CONTROLLERS ====================

// دالة بدء عملية الدفع وتوليد الرابط
// الفرونت يبعت بس: { items: [{ productId: 1, quantity: 2 }] }
export const processOnlinePayment = asyncHandler(async (req, res, next) => {
    const { items } = req.body;
    const { user } = req; // جاي من authentication

    if (!Array.isArray(items) || items.length === 0) {
        throwError("items are required", 400);
    }

    // الخطوة الأولى: احسب المبلغ في الباك من الداتابيز (مش من الفرونت)
    const ids = items.map((i) => i.productId);
    const products = await Product.findAll({ where: { id: ids, isActive: true } });

    let amountCents = 0;
    const paymobItems = items.map((item) => {
        const product = products.find((p) => p.id === Number(item.productId));
        const quantity = parseInt(item.quantity);
        if (!product || !Number.isInteger(quantity) || quantity < 1) {
            throwError("Invalid product or quantity", 400);
        }
        if (product.stock < quantity) {
            throwError(`Not enough stock for ${product.title}`, 400);
        }

        // لو فيه سعر بعد الخصم استخدمه، وإلا السعر العادي
        const finalPrice = product.discountPrice ?? product.price;
        const unitCents = Math.round(Number(finalPrice) * 100);
        amountCents += unitCents * quantity;

        return {
            name: product.title,
            amount_cents: unitCents,
            description: product.title,
            quantity,
        };
    });

    // الخطوة الثانية: بيانات الدفع من اليوزر المسجل (مع فك تشفير الموبايل)
    const phone = CryptoJS.AES.decrypt(user.phone, process.env.ecryptphone_key).toString(CryptoJS.enc.Utf8);
    const billingData = {
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone,
    };

    // الخطوة الثالثة: الحصول على الـ Auth Token وتسجيل الطلب
    const merchantOrderId = `${user.id}-${Date.now()}`; // الأفضل: id طلب حقيقي من جدول Order
    const authToken = await getPaymentAuthToken();
    const paymobOrderId = await createPaymentOrder(authToken, amountCents, paymobItems, merchantOrderId);

    // الخطوة الرابعة: طلب مفتاح الدفع
    const paymentKey = await getPaymentKey(authToken, paymobOrderId, amountCents, billingData);

    // الخطوة الخامسة: بناء رابط الـ Iframe
    const iframeId = process.env.PAYMOB_IFRAME_ID;
    const paymentUrl = `https://accept.paymob.com/api/acceptance/iframes/${iframeId}?payment_token=${paymentKey}`;

    return res.status(200).json({
        success: true,
        message: "Payment key generated successfully",
        paymentUrl,
    });
});

// دالة استقبال إشعارات الـ Webhook من Paymob بعد الدفع
export const paymobWebhook = asyncHandler(async (req, res, next) => {
    const transaction = req.body?.obj;

    // لازم نتأكد إن الطلب جاي من Paymob فعلاً
    if (!verifyPaymobHmac(transaction, req.query.hmac)) {
        return res.status(401).json({ success: false, message: "Invalid HMAC" });
    }

    if (transaction.success === true && transaction.pending === false) {
        const paymobOrderId = transaction.order.id;
        const merchantOrderId = transaction.order.merchant_order_id;
        const amountPaid = transaction.amount_cents / 100;

        // TODO: حدّث حالة الطلب في الداتابيز وتأكد إنه مش اتعلّم مدفوع قبل كده
        // await Order.update({ status: "paid" }, { where: { id: merchantOrderId, status: "pending" } });
        console.log(`Order ${merchantOrderId} (paymob ${paymobOrderId}) paid successfully with amount ${amountPaid}`);
    } else {
        console.log("Payment failed or pending");
    }

    return res.status(200).json({ received: true });
});
