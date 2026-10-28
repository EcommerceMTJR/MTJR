import axios from "axios";
import crypto from "crypto";
import CryptoJS from "crypto-js";
import db from "../../models/connection.js";
import asyncHandler from "../../middlewares/asyncHandler.js";
import { throwError } from "../../utils/helperFunction.js";
import Product from "../../models/Product.js";
// عدّل أسماء الملفات دي حسب أسماء ملفاتك الفعلية (حروف كبيرة/صغيرة مهمة على Vercel)
import Order, { orderStatuses, paymentMethods } from "../../models/Order.js"
import OrderItem from "../../models/OrderItem.js";
import Payment, { paymentStatuses } from "../../models/Payment.js";
import Address from "../../models/address.model.js";

// سعر الشحن بالجنيه (من .env لو موجود، وإلا 0)
const SHIPPING_PRICE = Number(process.env.SHIPPING_PRICE || 0);

// بيطلّع رد Paymob الحقيقي لو الطلب فشل (للتشخيص)
const paymobPost = async (url, body) => {
    try {
        return await axios.post(url, body);
    } catch (err) {
        console.error("PAYMOB ERROR:", url, err.response?.status, JSON.stringify(err.response?.data));
        throwError(`Paymob error: ${JSON.stringify(err.response?.data) || err.message}`, 400);
    }
};

// ==================== 1. SERVICES ====================

// 1. الحصول على الـ Auth Token
export const getPaymentAuthToken = async () => {
    const response = await paymobPost("https://accept.paymob.com/api/auth/tokens", {
        api_key: process.env.PAYMOB_API_KEY,
    });
    if (!response || !response.data.token) {
        throwError("Error in getPaymentAuthToken, Paymob Authentication failed", 400);
    }
    return response.data.token;
};

// 2. تسجيل الطلب
export const createPaymentOrder = async (authToken, amountCents, items, merchantOrderId) => {
    const response = await paymobPost("https://accept.paymob.com/api/ecommerce/orders", {
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
    const response = await paymobPost("https://accept.paymob.com/api/acceptance/payment_keys", {
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

// بدء الدفع
// الفرونت يبعت: { addressId: 1, items: [{ productId: 1, quantity: 2 }] }
export const processOnlinePayment = asyncHandler(async (req, res, next) => {
    const { items, addressId } = req.body;
    const { user } = req; // جاي من authentication

    if (!Array.isArray(items) || items.length === 0) {
        throwError("items are required", 400);
    }
    if (!addressId) {
        throwError("addressId is required", 400);
    }

    // العنوان لازم يكون بتاع اليوزر نفسه
    const address = await Address.findOne({ where: { id: addressId, userId: user.id } });
    if (!address) {
        throwError("Address not found", 404);
    }

    // ادمج المنتجات المكررة (نفس productId مرتين)
    const merged = new Map();
    for (const item of items) {
        const productId = Number(item.productId);
        const quantity = parseInt(item.quantity);
        if (!Number.isInteger(productId) || !Number.isInteger(quantity) || quantity < 1) {
            throwError("Invalid product or quantity", 400);
        }
        merged.set(productId, (merged.get(productId) || 0) + quantity);
    }

    // الخطوة الأولى: احسب المبلغ في الباك من الداتابيز (مش من الفرونت)
    const products = await Product.findAll({ where: { id: [...merged.keys()], isActive: true } });

    let itemsCents = 0;
    const orderLines = [];
    const paymobItems = [];

    for (const [productId, quantity] of merged) {
        const product = products.find((p) => p.id === productId);
        if (!product) {
            throwError("Invalid product or quantity", 400);
        }
        if (product.stock < quantity) {
            throwError(`Not enough stock for ${product.title}`, 400);
        }

        // لو فيه سعر بعد الخصم استخدمه، وإلا السعر العادي
        const finalPrice = product.discountPrice ?? product.price;
        const unitCents = Math.round(Number(finalPrice) * 100);
        itemsCents += unitCents * quantity;

        orderLines.push({ productId, quantity, price: unitCents / 100 });
        paymobItems.push({
            name: product.title,
            amount_cents: unitCents,
            description: product.title,
            quantity,
        });
    }

    // الشحن
    const shippingCents = Math.round(SHIPPING_PRICE * 100);
    if (shippingCents > 0) {
        paymobItems.push({
            name: "Shipping",
            amount_cents: shippingCents,
            description: "Shipping",
            quantity: 1,
        });
    }
    const amountCents = itemsCents + shippingCents;

    // الخطوة الثانية: سجّل الطلب والدفع في الداتابيز بحالة pending
    const order = await db.transaction(async (t) => {
        const newOrder = await Order.create(
            {
                userId: user.id,
                addressId: address.id,
                shippingPrice: SHIPPING_PRICE,
                totalOrderPrice: amountCents / 100,
                paymentMethod: paymentMethods.card,
                status: orderStatuses.pending,
            },
            { transaction: t },
        );

        await OrderItem.bulkCreate(
            orderLines.map((line) => ({ ...line, orderId: newOrder.id })),
            { transaction: t },
        );

        await Payment.create(
            {
                orderId: newOrder.id,
                amount: amountCents / 100,
                provider: "Paymob",
                status: paymentStatuses.pending,
            },
            { transaction: t },
        );

        return newOrder;
    });

    // الخطوة الثالثة: بيانات الدفع من اليوزر المسجل (مع فك تشفير الموبايل)
    const phone = CryptoJS.AES.decrypt(user.phone, process.env.ecryptphone_key).toString(CryptoJS.enc.Utf8);
    const billingData = {
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone,
    };

    // الخطوة الرابعة: اتصال Paymob، ولو فشل نلغي الطلب
    try {
        const authToken = await getPaymentAuthToken();
        const paymobOrderId = await createPaymentOrder(authToken, amountCents, paymobItems, String(order.id));
        const paymentKey = await getPaymentKey(authToken, paymobOrderId, amountCents, billingData);

        const iframeId = process.env.PAYMOB_IFRAME_ID;
        const paymentUrl = `https://accept.paymob.com/api/acceptance/iframes/${iframeId}?payment_token=${paymentKey}`;

        return res.status(200).json({
            success: true,
            message: "Payment key generated successfully",
            orderId: order.id,
            paymentUrl,
        });
    } catch (err) {
        await Order.update({ status: orderStatuses.cancelled }, { where: { id: order.id } });
        await Payment.update({ status: paymentStatuses.failed }, { where: { orderId: order.id } });
        throw err;
    }
});

// Webhook من Paymob (من غير authentication، الحماية بالـ HMAC)
export const paymobWebhook = asyncHandler(async (req, res, next) => {
    const transaction = req.body?.obj;

    // لازم نتأكد إن الطلب جاي من Paymob فعلاً
    if (!verifyPaymobHmac(transaction, req.query.hmac)) {
        return res.status(401).json({ success: false, message: "Invalid HMAC" });
    }

    const orderId = Number(transaction.order?.merchant_order_id);
    if (!Number.isInteger(orderId)) {
        console.warn("Webhook without valid merchant_order_id", transaction.order?.merchant_order_id);
        return res.status(200).json({ received: true });
    }

    // العملية لسه pending عند Paymob: مفيش حاجة نعملها
    if (transaction.pending === true) {
        return res.status(200).json({ received: true });
    }

    await db.transaction(async (t) => {
        // اقفل الصف عشان لو الـ webhook اتبعت مرتين مايتعالجش مرتين
        const order = await Order.findByPk(orderId, { transaction: t, lock: t.LOCK.UPDATE });
        if (!order) {
            console.warn(`Webhook for unknown order ${orderId}`);
            return;
        }

        // اتعالج قبل كده
        if (order.isPaid) {
            return;
        }

        // دفع فاشل
        if (transaction.success !== true) {
            await Payment.update({ status: paymentStatuses.failed, transactionId: String(transaction.id) }, { where: { orderId }, transaction: t });
            return;
        }

        // تأكد إن المبلغ المدفوع يساوي إجمالي الطلب
        const expectedCents = Math.round(Number(order.totalOrderPrice) * 100);
        if (Number(transaction.amount_cents) !== expectedCents) {
            console.error(`Amount mismatch for order ${orderId}: paid ${transaction.amount_cents}, expected ${expectedCents}`);
            return;
        }

        // علّم الطلب والدفع إنهم اتدفعوا
        await order.update({ isPaid: true, paidAt: new Date(), status: orderStatuses.processing }, { transaction: t });
        await Payment.update({ status: paymentStatuses.completed, transactionId: String(transaction.id) }, { where: { orderId }, transaction: t });

        // انقص المخزون وزوّد المبيعات
        const lines = await OrderItem.findAll({ where: { orderId }, transaction: t });
        for (const line of lines) {
            const product = await Product.findByPk(line.productId, { transaction: t, lock: t.LOCK.UPDATE });
            if (!product) continue;

            if (product.stock < line.quantity) {
                // اتباع آخر قطعة لحد تاني قبل ما الدفع يكتمل: الفلوس اتسحبت، يتراجع يدويًا
                console.error(`OVERSOLD product ${product.id} on order ${orderId}: needs manual handling/refund`);
            }

            await product.update(
                {
                    stock: Math.max(product.stock - line.quantity, 0),
                    soldCount: product.soldCount + line.quantity,
                },
                { transaction: t },
            );
        }

        console.log(`Order ${orderId} paid successfully with amount ${expectedCents / 100}`);
    });

    return res.status(200).json({ received: true });
});
