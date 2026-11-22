import { Op, fn, col } from "sequelize";
import db from "../../models/connection.js";
import asyncHandler from "../../middlewares/asyncHandler.js";
import { throwError } from "../../utils/helperFunction.js";
import { getPagination, pagination, parseId, handleDbError } from "../../utils/common.js";
import Review from "../../models/Review.js";
import Product from "../../models/Product.js";
import User from "../../models/user.model.js";
import Order, { orderStatuses } from "../../models/Order.js";
import OrderItem from "../../models/OrderItem.js";

// ==================== Helpers ====================

// يعيد حساب متوسط التقييم وعدد التقييمات في جدول المنتجات
const recalcRatings = async (productId, t) => {
    const row = await Review.findOne({
        attributes: [
            [fn("AVG", col("ratings")), "avg"],
            [fn("COUNT", col("id")), "count"],
        ],
        where: { productId },
        raw: true,
        transaction: t,
    });
    const count = Number(row.count);
    const avg = count ? Math.round(Number(row.avg) * 10) / 10 : 0;
    await Product.update({ ratingsAverage: avg, ratingsQuantity: count }, { where: { id: productId }, transaction: t });
};

// اليوزر يقيّم المنتج لو اشتراه فعلاً (طلب مدفوع أو اتسلّم، ومش ملغي)
const hasPurchased = async (userId, productId) => {
    const orders = await Order.findAll({
        where: {
            userId,
            status: { [Op.ne]: orderStatuses.cancelled },
            [Op.or]: [{ isPaid: true }, { status: orderStatuses.delivered }],
        },
        attributes: ["id"],
    });
    if (orders.length === 0) return false;
    const item = await OrderItem.findOne({ where: { orderId: orders.map((o) => o.id), productId } });
    return !!item;
};

const parseRatings = (value) => {
    const r = Number(value);
    if (Number.isNaN(r) || r < 1 || r > 5) throwError("ratings must be a number between 1 and 5", 400);
    return Math.round(r * 10) / 10;
};

const parseComment = (value) => {
    if (value === undefined || value === null) return null;
    const comment = String(value).trim();
    if (comment.length > 1000) throwError("comment is too long (max 1000 characters)", 400);
    return comment || null;
};

// ==================== Controllers ====================

// GET /reviews/product/:productId  (عام)
export const getProductReviews = asyncHandler(async (req, res) => {
    const productId = parseId(req.params.productId);
    const { page, limit, offset } = getPagination(req.query, 10);

    const product = await Product.findOne({
        where: { id: productId, isActive: true },
        attributes: ["id", "ratingsAverage", "ratingsQuantity"],
    });
    if (!product) throwError("Product not found", 404);

    const { rows, count } = await Review.findAndCountAll({
        where: { productId },
        order: [["createdAt", "DESC"]],
        limit,
        offset,
    });

    const users = await User.findAll({
        where: { id: rows.map((r) => r.userId) },
        attributes: ["id", "firstName", "lastName"],
    });

    res.status(200).json({
        success: true,
        summary: { ratingsAverage: Number(product.ratingsAverage), ratingsQuantity: product.ratingsQuantity },
        pagination: pagination(page, limit, count),
        result: rows.map((r) => {
            const u = users.find((x) => x.id === r.userId);
            return {
                id: r.id,
                ratings: Number(r.ratings),
                comment: r.comment,
                createdAt: r.createdAt,
                // الاسم الأول وأول حرف من الاسم الأخير بس (خصوصية)
                reviewer: u ? `${u.firstName} ${(u.lastName || "").charAt(0)}.`.trim() : "User",
                isMine: req.user ? r.userId === req.user.id : false,
            };
        }),
    });
});

// POST /reviews  body: { productId, ratings, comment? }
export const createReview = asyncHandler(async (req, res) => {
    const productId = parseId(req.body.productId);
    const ratings = parseRatings(req.body.ratings);
    const comment = parseComment(req.body.comment);

    const product = await Product.findByPk(productId);
    if (!product) throwError("Product not found", 404);

    if (!(await hasPurchased(req.user.id, productId))) {
        throwError("You can only review products you have purchased", 403);
    }

    const existing = await Review.findOne({ where: { userId: req.user.id, productId } });
    if (existing) throwError("You already reviewed this product", 409);

    try {
        const review = await db.transaction(async (t) => {
            const created = await Review.create({ userId: req.user.id, productId, ratings, comment }, { transaction: t });
            await recalcRatings(productId, t);
            return created;
        });
        res.status(201).json({ success: true, message: "Review added", result: review });
    } catch (err) {
        handleDbError(err);
    }
});

// PATCH /reviews/:id  body: { ratings?, comment? }
export const updateReview = asyncHandler(async (req, res) => {
    const review = await Review.findOne({ where: { id: parseId(req.params.id), userId: req.user.id } });
    if (!review) throwError("Review not found", 404);

    const changes = {};
    if (req.body.ratings !== undefined) changes.ratings = parseRatings(req.body.ratings);
    if (req.body.comment !== undefined) changes.comment = parseComment(req.body.comment);
    if (Object.keys(changes).length === 0) throwError("Nothing to update", 400);

    await db.transaction(async (t) => {
        await review.update(changes, { transaction: t });
        await recalcRatings(review.productId, t);
    });

    res.status(200).json({ success: true, message: "Review updated", result: review });
});

export const deleteReview = asyncHandler(async (req, res) => {
    const review = await Review.findOne({ where: { id: parseId(req.params.id), userId: req.user.id } });
    if (!review) throwError("Review not found", 404);

    await db.transaction(async (t) => {
        await review.destroy({ transaction: t });
        await recalcRatings(review.productId, t);
    });

    res.status(200).json({ success: true, message: "Review deleted" });
});
