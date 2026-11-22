import asyncHandler from "../../middlewares/asyncHandler.js";
import { throwError } from "../../utils/helperFunction.js";
import { parseId, finalPriceOf } from "../../utils/common.js";
import Wishlist from "../../models/Wishlist.js";
import WishlistItem from "../../models/WishlistItem.js";
import Product from "../../models/Product.js";

const getOrCreateWishlist = async (userId) => {
    const [wishlist] = await Wishlist.findOrCreate({ where: { userId }, defaults: { userId } });
    return wishlist;
};

export const getWishlist = asyncHandler(async (req, res) => {
    const wishlist = await getOrCreateWishlist(req.user.id);
    const items = await WishlistItem.findAll({ where: { wishlistId: wishlist.id }, order: [["createdAt", "DESC"]] });
    const products = await Product.findAll({ where: { id: items.map((i) => i.productId) } });

    const result = items
        .map((item) => {
            const p = products.find((x) => x.id === item.productId);
            if (!p || !p.isActive) return null; // المنتج المخفي مبيظهرش
            return {
                id: item.id,
                productId: p.id,
                title: p.title,
                slug: p.slug,
                coverImage: p.coverImage,
                price: Number(p.price),
                finalPrice: finalPriceOf(p),
                inStock: p.stock > 0,
                addedAt: item.createdAt,
            };
        })
        .filter(Boolean);

    res.status(200).json({ success: true, result });
});

export const addToWishlist = asyncHandler(async (req, res) => {
    const productId = parseId(req.params.productId);
    const product = await Product.findOne({ where: { id: productId, isActive: true } });
    if (!product) throwError("Product not found", 404);

    const wishlist = await getOrCreateWishlist(req.user.id);
    const [, created] = await WishlistItem.findOrCreate({
        where: { wishlistId: wishlist.id, productId },
        defaults: { wishlistId: wishlist.id, productId },
    });

    res.status(created ? 201 : 200).json({
        success: true,
        message: created ? "Added to wishlist" : "Already in wishlist",
    });
});

export const removeFromWishlist = asyncHandler(async (req, res) => {
    const productId = parseId(req.params.productId);
    const wishlist = await getOrCreateWishlist(req.user.id);
    const deleted = await WishlistItem.destroy({ where: { wishlistId: wishlist.id, productId } });
    if (!deleted) throwError("Product is not in your wishlist", 404);

    res.status(200).json({ success: true, message: "Removed from wishlist" });
});
