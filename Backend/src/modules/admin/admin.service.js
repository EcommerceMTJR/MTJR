import { Op, fn, col } from "sequelize";
import db from "../../models/connection.js";
import asyncHandler from "../../middlewares/asyncHandler.js";
import { throwError } from "../../utils/helperFunction.js";
import User from "../../models/user.model.js";
import Product from "../../models/Product.js";
import Category from "../../models/Category.js";
import Order, { orderStatuses, paymentMethods } from "../../models/Order.js";
import OrderItem from "../../models/OrderItem.js";
import Payment, { paymentStatuses } from "../../models/Payment.js";
import Address from "../../models/address.model.js";

// ==================== Helpers ====================

const getPagination = (query) => {
    const page = Math.max(parseInt(query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(query.limit) || 20, 1), 100);
    return { page, limit, offset: (page - 1) * limit };
};

const pagination = (page, limit, total) => ({
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
});

// ياخد الحقول المسموحة بس (يمنع تعديل حقول مش المفروض تتعدل)
const pick = (obj, keys) => Object.fromEntries(keys.filter((k) => obj?.[k] !== undefined).map((k) => [k, obj[k]]));

const parseId = (value) => {
    const id = Number(value);
    if (!Number.isInteger(id) || id < 1) throwError("Invalid id", 400);
    return id;
};

const makeSlug = (text) => {
    const base = String(text)
        .trim()
        .toLowerCase()
        .replace(/[^\p{L}\p{N}]+/gu, "-")
        .replace(/^-+|-+$/g, "");
    return `${base || "item"}-${Date.now().toString(36)}`;
};

// يحوّل أخطاء Sequelize لرسائل مفهومة
const handleDbError = (err) => {
    if (err.name === "SequelizeUniqueConstraintError") throwError("Name or slug already exists", 409);
    if (err.name === "SequelizeValidationError") throwError(err.errors.map((e) => e.message).join(", "), 400);
    if (err.name === "SequelizeForeignKeyConstraintError") throwError("Invalid reference or item is in use", 400);
    throw err;
};

// ==================== 1. Stats ====================

export const getStats = asyncHandler(async (req, res) => {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [revenue, ordersByStatus, salesByDay, totalUsers, newUsers, totalProducts, lowStock, topProducts, recentOrders] = await Promise.all([
        Order.findOne({
            attributes: [
                [fn("COALESCE", fn("SUM", col("totalOrderPrice")), 0), "total"],
                [fn("COUNT", col("id")), "paidOrders"],
            ],
            where: { isPaid: true },
            raw: true,
        }),
        Order.findAll({
            attributes: ["status", [fn("COUNT", col("id")), "count"]],
            group: ["status"],
            raw: true,
        }),
        Order.findAll({
            attributes: [
                [fn("DATE", col("paidAt")), "day"],
                [fn("SUM", col("totalOrderPrice")), "revenue"],
                [fn("COUNT", col("id")), "orders"],
            ],
            where: { isPaid: true, paidAt: { [Op.gte]: since } },
            group: [fn("DATE", col("paidAt"))],
            order: [[fn("DATE", col("paidAt")), "ASC"]],
            raw: true,
        }),
        User.count(),
        User.count({ where: { createdAt: { [Op.gte]: since } } }),
        Product.count(),
        Product.findAll({
            attributes: ["id", "title", "stock"],
            where: { isActive: true, stock: { [Op.lte]: 5 } },
            order: [["stock", "ASC"]],
            limit: 10,
        }),
        Product.findAll({
            attributes: ["id", "title", "soldCount", "stock", "coverImage"],
            order: [["soldCount", "DESC"]],
            limit: 5,
        }),
        Order.findAll({ order: [["createdAt", "DESC"]], limit: 10 }),
    ]);

    res.status(200).json({
        success: true,
        result: {
            revenue: Number(revenue.total),
            paidOrders: Number(revenue.paidOrders),
            ordersByStatus,
            salesLast30Days: salesByDay,
            users: { total: totalUsers, newLast30Days: newUsers },
            products: { total: totalProducts, lowStock },
            topProducts,
            recentOrders,
        },
    });
});

// ==================== 2. Orders ====================

export const getOrders = asyncHandler(async (req, res) => {
    const { page, limit, offset } = getPagination(req.query);
    const where = {};
    if (req.query.status) {
        if (!Object.values(orderStatuses).includes(req.query.status)) throwError("Invalid status", 400);
        where.status = req.query.status;
    }
    if (req.query.isPaid === "true" || req.query.isPaid === "false") where.isPaid = req.query.isPaid === "true";
    if (req.query.userId) where.userId = parseId(req.query.userId);

    const { rows, count } = await Order.findAndCountAll({
        where,
        order: [["createdAt", "DESC"]],
        limit,
        offset,
    });

    res.status(200).json({ success: true, pagination: pagination(page, limit, count), result: rows });
});

export const getOrderById = asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);
    const order = await Order.findByPk(id);
    if (!order) throwError("Order not found", 404);

    const items = await OrderItem.findAll({ where: { orderId: id } });
    const [products, user, address, payment] = await Promise.all([
        Product.findAll({
            where: { id: items.map((i) => i.productId) },
            attributes: ["id", "title", "coverImage"],
        }),
        User.findByPk(order.userId, { attributes: ["id", "firstName", "lastName", "email"] }),
        Address.findByPk(order.addressId),
        Payment.findOne({ where: { orderId: id } }),
    ]);

    res.status(200).json({
        success: true,
        result: {
            order,
            user,
            address,
            payment,
            items: items.map((item) => ({
                ...item.toJSON(),
                product: products.find((p) => p.id === item.productId) || null,
            })),
        },
    });
});

export const updateOrderStatus = asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);
    const { status } = req.body;
    if (!Object.values(orderStatuses).includes(status)) throwError("Invalid status", 400);

    const updated = await db.transaction(async (t) => {
        const order = await Order.findByPk(id, { transaction: t, lock: t.LOCK.UPDATE });
        if (!order) throwError("Order not found", 404);
        if (order.status === status) return order;

        if ([orderStatuses.cancelled, orderStatuses.delivered].includes(order.status)) {
            throwError(`Cannot change a ${order.status} order`, 400);
        }
        // طلب كارت لسه ما اتدفعش مينفعش يتجهز أو يتشحن
        if (order.paymentMethod === paymentMethods.card && !order.isPaid && status !== orderStatuses.cancelled) {
            throwError("Order is not paid yet", 400);
        }

        const changes = { status };
        if (status === orderStatuses.delivered) {
            changes.deliveredAt = new Date();
            // الدفع عند الاستلام: الفلوس بتتأكد وقت التسليم
            if (order.paymentMethod === paymentMethods.cash && !order.isPaid) {
                changes.isPaid = true;
                changes.paidAt = new Date();
                await Payment.update({ status: paymentStatuses.completed }, { where: { orderId: id }, transaction: t });
            }
        }

        // إلغاء: رجّع المخزون لو الطلب مدفوع أو كاش (المخزون بيتحجز وقت الطلب)
        // الاسترداد المالي للمدفوع أونلاين بيتم يدويًا من Paymob
        if (status === orderStatuses.cancelled && (order.isPaid || order.paymentMethod === paymentMethods.cash)) {
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
        }

        await order.update(changes, { transaction: t });
        return order;
    });

    res.status(200).json({ success: true, message: "Order status updated", result: updated });
});

// ==================== 3. Products ====================

const PRODUCT_CREATE_FIELDS = ["title", "slug", "description", "price", "discountPrice", "stock", "coverImage", "isActive", "categoryId"];

export const getProducts = asyncHandler(async (req, res) => {
    const { page, limit, offset } = getPagination(req.query);
    const where = {};
    if (req.query.search) where.title = { [Op.iLike]: `%${req.query.search}%` };
    if (req.query.categoryId) where.categoryId = parseId(req.query.categoryId);
    if (req.query.isActive === "true" || req.query.isActive === "false") where.isActive = req.query.isActive === "true";

    const { rows, count } = await Product.findAndCountAll({
        where,
        order: [["createdAt", "DESC"]],
        limit,
        offset,
    });

    res.status(200).json({ success: true, pagination: pagination(page, limit, count), result: rows });
});

export const createProduct = asyncHandler(async (req, res) => {
    const data = pick(req.body, PRODUCT_CREATE_FIELDS);
    for (const field of ["title", "description", "price", "coverImage", "categoryId"]) {
        if (data[field] === undefined || data[field] === "") throwError(`${field} is required`, 400);
    }
    if (data.discountPrice != null && Number(data.discountPrice) >= Number(data.price)) {
        throwError("discountPrice must be less than price", 400);
    }

    const category = await Category.findByPk(data.categoryId);
    if (!category) throwError("Category not found", 404);

    data.slug = data.slug ? String(data.slug) : makeSlug(data.title);

    try {
        const product = await Product.create(data);
        res.status(201).json({ success: true, message: "Product created", result: product });
    } catch (err) {
        handleDbError(err);
    }
});

export const updateProduct = asyncHandler(async (req, res) => {
    const product = await Product.findByPk(parseId(req.params.id));
    if (!product) throwError("Product not found", 404);

    const data = pick(req.body, PRODUCT_CREATE_FIELDS);
    if (data.categoryId !== undefined && !(await Category.findByPk(data.categoryId))) {
        throwError("Category not found", 404);
    }

    const price = Number(data.price ?? product.price);
    const discount = data.discountPrice !== undefined ? data.discountPrice : product.discountPrice;
    if (discount != null && Number(discount) >= price) {
        throwError("discountPrice must be less than price", 400);
    }

    try {
        await product.update(data);
        res.status(200).json({ success: true, message: "Product updated", result: product });
    } catch (err) {
        handleDbError(err);
    }
});

// حذف ناعم: المنتج بيتخفي بس، لأن الطلبات القديمة مربوطة بيه
export const deleteProduct = asyncHandler(async (req, res) => {
    const product = await Product.findByPk(parseId(req.params.id));
    if (!product) throwError("Product not found", 404);
    await product.update({ isActive: false });
    res.status(200).json({ success: true, message: "Product deactivated" });
});

// ==================== 4. Categories ====================

const CATEGORY_FIELDS = ["name", "slug", "description", "image", "parentId", "isActive"];

export const getCategories = asyncHandler(async (req, res) => {
    const categories = await Category.findAll({ order: [["name", "ASC"]] });
    res.status(200).json({ success: true, result: categories });
});

export const createCategory = asyncHandler(async (req, res) => {
    const data = pick(req.body, CATEGORY_FIELDS);
    if (!data.name) throwError("name is required", 400);
    if (data.parentId != null && !(await Category.findByPk(data.parentId))) {
        throwError("Parent category not found", 404);
    }
    data.slug = data.slug ? String(data.slug) : makeSlug(data.name);

    try {
        const category = await Category.create(data);
        res.status(201).json({ success: true, message: "Category created", result: category });
    } catch (err) {
        handleDbError(err);
    }
});

export const updateCategory = asyncHandler(async (req, res) => {
    const category = await Category.findByPk(parseId(req.params.id));
    if (!category) throwError("Category not found", 404);

    const data = pick(req.body, CATEGORY_FIELDS);
    if (data.parentId != null) {
        if (Number(data.parentId) === category.id) throwError("Category cannot be its own parent", 400);
        if (!(await Category.findByPk(data.parentId))) throwError("Parent category not found", 404);
    }

    try {
        await category.update(data);
        res.status(200).json({ success: true, message: "Category updated", result: category });
    } catch (err) {
        handleDbError(err);
    }
});

export const deleteCategory = asyncHandler(async (req, res) => {
    const category = await Category.findByPk(parseId(req.params.id));
    if (!category) throwError("Category not found", 404);

    const productsCount = await Product.count({ where: { categoryId: category.id } });
    if (productsCount > 0) throwError("Category has products, move or deactivate them first", 409);

    await category.destroy();
    res.status(200).json({ success: true, message: "Category deleted" });
});

// ==================== 5. Users ====================

// مفيش password ولا موبايل (مشفّر) ولا token في الرد
const USER_HIDDEN = ["password", "phone", "verificationToken"];

export const getUsers = asyncHandler(async (req, res) => {
    const { page, limit, offset } = getPagination(req.query);
    const where = {};
    if (req.query.role) where.role = req.query.role;
    if (req.query.search) {
        const like = { [Op.iLike]: `%${req.query.search}%` };
        where[Op.or] = [{ email: like }, { firstName: like }, { lastName: like }];
    }

    const { rows, count } = await User.findAndCountAll({
        where,
        attributes: { exclude: USER_HIDDEN },
        order: [["createdAt", "DESC"]],
        limit,
        offset,
    });

    res.status(200).json({ success: true, pagination: pagination(page, limit, count), result: rows });
});

export const getUserById = asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);
    const user = await User.findByPk(id, { attributes: { exclude: USER_HIDDEN } });
    if (!user) throwError("User not found", 404);

    const [ordersCount, spent] = await Promise.all([
        Order.count({ where: { userId: id } }),
        Order.findOne({
            attributes: [[fn("COALESCE", fn("SUM", col("totalOrderPrice")), 0), "total"]],
            where: { userId: id, isPaid: true },
            raw: true,
        }),
    ]);

    res.status(200).json({
        success: true,
        result: { user, ordersCount, totalSpent: Number(spent.total) },
    });
});

export const updateUserStatus = asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);
    const { isActive } = req.body;
    if (typeof isActive !== "boolean") throwError("isActive must be true or false", 400);
    if (id === req.user.id) throwError("You cannot change your own status", 400);

    const user = await User.findByPk(id, { attributes: { exclude: USER_HIDDEN } });
    if (!user) throwError("User not found", 404);

    await user.update({ isActive });
    res.status(200).json({
        success: true,
        message: isActive ? "User activated" : "User deactivated",
        result: user,
    });
});
