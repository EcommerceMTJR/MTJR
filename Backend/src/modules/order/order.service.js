import { Op } from "sequelize";
import db from "../../models/connection.js";
import asyncHandler from "../../middlewares/asyncHandler.js";
import { throwError } from "../../utils/helperFunction.js";
import { getPagination, pagination, parseId, finalPriceOf } from "../../utils/common.js";
import Cart from "../../models/Cart.js";
import CartItem from "../../models/CartItem.js";
import Product from "../../models/Product.js";
import Order, { orderStatuses, paymentMethods } from "../../models/Order.js";
import OrderItem from "../../models/OrderItem.js";
import Payment, { paymentStatuses } from "../../models/Payment.js";
import Address from "../../models/address.model.js";

// سعر الشحن بالجنيه (من .env لو موجود، وإلا 0)
const SHIPPING_PRICE = Number(process.env.SHIPPING_PRICE || 0);

// ==================== Checkout (دفع عند الاستلام) ====================
// الدفع بالكارت بيفضل من POST /payment/pay
// body: { addressId, paymentMethod?: "cash" }

export const checkout = asyncHandler(async (req, res) => {
    const { user } = req;
    const addressId = parseId(req.body.addressId);
    const method = req.body.paymentMethod ?? paymentMethods.cash;
    if (method !== paymentMethods.cash) throwError("For card payments use POST /payment/pay", 400);

    const address = await Address.findOne({ where: { id: addressId, userId: user.id } });
    if (!address) throwError("Address not found", 404);

    const cart = await Cart.findOne({ where: { userId: user.id } });
    if (!cart) throwError("Cart is empty", 400);

    const order = await db.transaction(async (t) => {
        const cartItems = await CartItem.findAll({ where: { cartId: cart.id }, transaction: t });
        if (cartItems.length === 0) throwError("Cart is empty", 400);

        // ادمج الكميات لو نفس المنتج اتكرر
        const quantities = new Map();
        for (const item of cartItems) {
            quantities.set(item.productId, (quantities.get(item.productId) || 0) + item.quantity);
        }

        // اقفل صفوف المنتجات عشان محدش يشتري نفس آخر قطعة في نفس اللحظة
        const products = await Product.findAll({
            where: { id: [...quantities.keys()] },
            transaction: t,
            lock: t.LOCK.UPDATE,
        });

        let itemsCents = 0;
        const lines = [];
        for (const [productId, quantity] of quantities) {
            const product = products.find((p) => p.id === productId);
            if (!product || !product.isActive) throwError("A product in your cart is no longer available", 400);
            if (product.stock < quantity) throwError(`Not enough stock for ${product.title}`, 400);

            const unitCents = Math.round(finalPriceOf(product) * 100);
            itemsCents += unitCents * quantity;
            lines.push({ product, productId, quantity, price: unitCents / 100 });
        }

        const total = (itemsCents + Math.round(SHIPPING_PRICE * 100)) / 100;

        const newOrder = await Order.create(
            {
                userId: user.id,
                addressId: address.id,
                shippingPrice: SHIPPING_PRICE,
                totalOrderPrice: total,
                paymentMethod: paymentMethods.cash,
                status: orderStatuses.pending,
            },
            { transaction: t },
        );

        await OrderItem.bulkCreate(
            lines.map((l) => ({ orderId: newOrder.id, productId: l.productId, quantity: l.quantity, price: l.price })),
            { transaction: t },
        );

        await Payment.create({ orderId: newOrder.id, amount: total, provider: "COD", status: paymentStatuses.pending }, { transaction: t });

        // احجز المخزون من دلوقتي
        for (const l of lines) {
            await l.product.update({ stock: l.product.stock - l.quantity, soldCount: l.product.soldCount + l.quantity }, { transaction: t });
        }

        // فضّي السلة
        await CartItem.destroy({ where: { cartId: cart.id }, transaction: t });
        await cart.update({ totalCartPrice: 0 }, { transaction: t });

        return newOrder;
    });

    res.status(201).json({
        success: true,
        message: "Order placed successfully",
        result: { orderId: order.id, totalOrderPrice: Number(order.totalOrderPrice), status: order.status },
    });
});

// ==================== طلباتي ====================

export const getMyOrders = asyncHandler(async (req, res) => {
    const { page, limit, offset } = getPagination(req.query);
    const where = { userId: req.user.id };
    if (req.query.status) {
        if (!Object.values(orderStatuses).includes(req.query.status)) throwError("Invalid status", 400);
        where.status = req.query.status;
    }

    const { rows, count } = await Order.findAndCountAll({
        where,
        order: [["createdAt", "DESC"]],
        limit,
        offset,
    });

    res.status(200).json({ success: true, pagination: pagination(page, limit, count), result: rows });
});

export const getMyOrderById = asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);
    // الشرط على userId يمنع أي يوزر يشوف طلب حد تاني
    const order = await Order.findOne({ where: { id, userId: req.user.id } });
    if (!order) throwError("Order not found", 404);

    const items = await OrderItem.findAll({ where: { orderId: id } });
    const [products, address, payment] = await Promise.all([
        Product.findAll({ where: { id: items.map((i) => i.productId) }, attributes: ["id", "title", "slug", "coverImage"] }),
        Address.findByPk(order.addressId),
        Payment.findOne({ where: { orderId: id }, attributes: ["provider", "status", "amount"] }),
    ]);

    res.status(200).json({
        success: true,
        result: {
            order,
            address,
            payment,
            items: items.map((item) => ({
                ...item.toJSON(),
                product: products.find((p) => p.id === item.productId) || null,
            })),
        },
    });
});

// إلغاء: طلبات الدفع عند الاستلام اللي لسه pending بس
export const cancelMyOrder = asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);

    await db.transaction(async (t) => {
        const order = await Order.findOne({
            where: { id, userId: req.user.id },
            transaction: t,
            lock: t.LOCK.UPDATE,
        });
        if (!order) throwError("Order not found", 404);

        if (order.status !== orderStatuses.pending) {
            throwError("Only pending orders can be cancelled", 400);
        }
        if (order.paymentMethod !== paymentMethods.cash) {
            throwError("Online payment orders cannot be cancelled here, please contact support", 400);
        }

        // رجّع المخزون اللي اتحجز وقت الطلب
        const lines = await OrderItem.findAll({ where: { orderId: id }, transaction: t });
        for (const line of lines) {
            const product = await Product.findByPk(line.productId, { transaction: t, lock: t.LOCK.UPDATE });
            if (!product) continue;
            await product.update(
                {
                    stock: product.stock + line.quantity,
                    soldCount: Math.max(product.soldCount - line.quantity, 0),
                },
                { transaction: t },
            );
        }

        await order.update({ status: orderStatuses.cancelled }, { transaction: t });
        await Payment.update({ status: paymentStatuses.failed }, { where: { orderId: id }, transaction: t });
    });

    res.status(200).json({ success: true, message: "Order cancelled" });
});
