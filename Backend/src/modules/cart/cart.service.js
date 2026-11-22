import asyncHandler from "../../middlewares/asyncHandler.js";
import { throwError } from "../../utils/helperFunction.js";
import { parseId, finalPriceOf } from "../../utils/common.js";
import Cart from "../../models/Cart.js";
import CartItem from "../../models/CartItem.js";
import Product from "../../models/Product.js";

const getOrCreateCart = async (userId) => {
    const [cart] = await Cart.findOrCreate({ where: { userId }, defaults: { userId } });
    return cart;
};

// بيحدّث أسعار السلة بأسعار المنتجات الحالية ويحسب الإجمالي ويرجّع شكل جاهز للفرونت
const buildCart = async (cart) => {
    const items = await CartItem.findAll({ where: { cartId: cart.id }, order: [["createdAt", "ASC"]] });
    const products = await Product.findAll({ where: { id: items.map((i) => i.productId) } });

    let total = 0;
    let itemsCount = 0;
    const view = [];

    for (const item of items) {
        const product = products.find((p) => p.id === item.productId);

        if (product) {
            const current = finalPriceOf(product);
            if (Number(item.price) !== current) await item.update({ price: current });
        }

        const unitPrice = Number(item.price);
        const lineTotal = Math.round(unitPrice * item.quantity * 100) / 100;
        total += lineTotal;
        itemsCount += item.quantity;

        view.push({
            id: item.id,
            productId: item.productId,
            quantity: item.quantity,
            price: unitPrice,
            lineTotal,
            available: !!product && product.isActive && product.stock > 0,
            exceedsStock: !!product && item.quantity > product.stock,
            product: product
                ? { id: product.id, title: product.title, slug: product.slug, coverImage: product.coverImage, stock: product.stock }
                : null,
        });
    }

    total = Math.round(total * 100) / 100;
    if (Number(cart.totalCartPrice) !== total) await cart.update({ totalCartPrice: total });

    return { id: cart.id, totalCartPrice: total, itemsCount, items: view };
};

// ==================== Controllers ====================

export const getCart = asyncHandler(async (req, res) => {
    const cart = await getOrCreateCart(req.user.id);
    res.status(200).json({ success: true, result: await buildCart(cart) });
});

// body: { productId, quantity? }
export const addItem = asyncHandler(async (req, res) => {
    const productId = parseId(req.body.productId);
    const quantity = req.body.quantity === undefined ? 1 : parseInt(req.body.quantity);
    if (!Number.isInteger(quantity) || quantity < 1) throwError("Invalid quantity", 400);

    const product = await Product.findOne({ where: { id: productId, isActive: true } });
    if (!product) throwError("Product not found", 404);

    const cart = await getOrCreateCart(req.user.id);
    const existing = await CartItem.findOne({ where: { cartId: cart.id, productId } });

    const newQuantity = (existing?.quantity || 0) + quantity;
    if (newQuantity > product.stock) throwError(`Only ${product.stock} left in stock`, 400);

    const price = finalPriceOf(product);
    if (existing) await existing.update({ quantity: newQuantity, price });
    else await CartItem.create({ cartId: cart.id, productId, quantity, price });

    res.status(200).json({ success: true, message: "Added to cart", result: await buildCart(cart) });
});

// body: { quantity }  (بتحدد الكمية النهائية)
export const updateItem = asyncHandler(async (req, res) => {
    const quantity = parseInt(req.body.quantity);
    if (!Number.isInteger(quantity) || quantity < 1) throwError("Invalid quantity", 400);

    const cart = await getOrCreateCart(req.user.id);
    const item = await CartItem.findOne({ where: { id: parseId(req.params.itemId), cartId: cart.id } });
    if (!item) throwError("Cart item not found", 404);

    const product = await Product.findOne({ where: { id: item.productId, isActive: true } });
    if (!product) throwError("Product is no longer available", 400);
    if (quantity > product.stock) throwError(`Only ${product.stock} left in stock`, 400);

    await item.update({ quantity, price: finalPriceOf(product) });
    res.status(200).json({ success: true, message: "Cart updated", result: await buildCart(cart) });
});

export const removeItem = asyncHandler(async (req, res) => {
    const cart = await getOrCreateCart(req.user.id);
    const deleted = await CartItem.destroy({ where: { id: parseId(req.params.itemId), cartId: cart.id } });
    if (!deleted) throwError("Cart item not found", 404);

    res.status(200).json({ success: true, message: "Item removed", result: await buildCart(cart) });
});

export const clearCart = asyncHandler(async (req, res) => {
    const cart = await getOrCreateCart(req.user.id);
    await CartItem.destroy({ where: { cartId: cart.id } });
    await cart.update({ totalCartPrice: 0 });
    res.status(200).json({ success: true, message: "Cart cleared", result: await buildCart(cart) });
});
