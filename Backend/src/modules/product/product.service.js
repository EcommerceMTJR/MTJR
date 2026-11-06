import { Op, fn, col, where as sqlWhere } from "sequelize";
import asyncHandler from "../../middlewares/asyncHandler.js";
import { throwError } from "../../utils/helperFunction.js";
import Product from "../../models/Product.js";
import Category from "../../models/Category.js";

// ==================== Helpers ====================

const getPagination = (query) => {
    const page = Math.max(parseInt(query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(query.limit) || 12, 1), 60);
    return { page, limit, offset: (page - 1) * limit };
};

// السعر الفعلي: السعر بعد الخصم لو موجود، وإلا السعر العادي
const effectivePrice = () => fn("COALESCE", col("discountPrice"), col("price"));

// يضيف finalPrice وخصم% وحالة التوفر لكل منتج
const formatProduct = (product) => {
    const p = product.toJSON();
    const price = Number(p.price);
    const finalPrice = Number(p.discountPrice ?? p.price);
    return {
        ...p,
        finalPrice,
        discountPercent: p.discountPrice != null && price > 0 ? Math.round((1 - finalPrice / price) * 100) : 0,
        inStock: p.stock > 0,
    };
};

const SORTS = {
    newest: [["createdAt", "DESC"]],
    price_asc: [[effectivePrice(), "ASC"]],
    price_desc: [[effectivePrice(), "DESC"]],
    best_selling: [["soldCount", "DESC"]],
    top_rated: [
        ["ratingsAverage", "DESC"],
        ["ratingsQuantity", "DESC"],
    ],
};

// ==================== 1. Products (public) ====================

// GET /products?search=&category=slug&categoryId=&minPrice=&maxPrice=&inStock=true&sort=newest&page=&limit=
export const getProducts = asyncHandler(async (req, res) => {
    const { page, limit, offset } = getPagination(req.query);
    const { search, category, categoryId, minPrice, maxPrice, inStock, sort } = req.query;

    const conditions = [{ isActive: true }];

    if (search) conditions.push({ title: { [Op.iLike]: `%${search}%` } });
    if (inStock === "true") conditions.push({ stock: { [Op.gt]: 0 } });

    // فلتر القسم (بالـ id أو بالـ slug) ويشمل الأقسام الفرعية
    let rootCategoryId = categoryId ? Number(categoryId) : null;
    if (category) {
        const found = await Category.findOne({ where: { slug: category, isActive: true } });
        if (!found) {
            return res.status(200).json({
                success: true,
                pagination: { page, limit, total: 0, totalPages: 0 },
                result: [],
            });
        }
        rootCategoryId = found.id;
    }
    if (rootCategoryId) {
        const children = await Category.findAll({ where: { parentId: rootCategoryId }, attributes: ["id"] });
        conditions.push({ categoryId: [rootCategoryId, ...children.map((c) => c.id)] });
    }

    // فلتر السعر على السعر الفعلي (بعد الخصم)
    if (minPrice !== undefined && !Number.isNaN(Number(minPrice))) {
        conditions.push(sqlWhere(effectivePrice(), { [Op.gte]: Number(minPrice) }));
    }
    if (maxPrice !== undefined && !Number.isNaN(Number(maxPrice))) {
        conditions.push(sqlWhere(effectivePrice(), { [Op.lte]: Number(maxPrice) }));
    }

    const { rows, count } = await Product.findAndCountAll({
        where: { [Op.and]: conditions },
        order: SORTS[sort] || SORTS.newest,
        limit,
        offset,
    });

    res.status(200).json({
        success: true,
        pagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) },
        result: rows.map(formatProduct),
    });
});

// GET /products/:slug
export const getProductBySlug = asyncHandler(async (req, res) => {
    const product = await Product.findOne({ where: { slug: req.params.slug, isActive: true } });
    if (!product) throwError("Product not found", 404);

    const [category, related] = await Promise.all([
        Category.findByPk(product.categoryId, { attributes: ["id", "name", "slug"] }),
        Product.findAll({
            where: { categoryId: product.categoryId, isActive: true, id: { [Op.ne]: product.id } },
            order: [["soldCount", "DESC"]],
            limit: 4,
        }),
    ]);

    res.status(200).json({
        success: true,
        result: { ...formatProduct(product), category, related: related.map(formatProduct) },
    });
});

// ==================== 2. Categories (public) ====================

// GET /categories  ← شجرة الأقسام (رئيسي ← فرعي)
export const getCategories = asyncHandler(async (req, res) => {
    const categories = await Category.findAll({
        where: { isActive: true },
        order: [["name", "ASC"]],
    });

    const nodes = categories.map((c) => ({ ...c.toJSON(), children: [] }));
    const byId = new Map(nodes.map((n) => [n.id, n]));
    const tree = [];
    for (const node of nodes) {
        const parent = node.parentId ? byId.get(node.parentId) : null;
        if (parent) parent.children.push(node);
        else tree.push(node);
    }

    res.status(200).json({ success: true, result: tree });
});
