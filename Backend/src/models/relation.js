import db from "./connection.js";
import User from "./user.model.js";
import Address from "./address.model.js";
import Product from "./Product.js";
import Cart from "./Cart.js";
import CartItem from "./CartItem.js";
import Order from "./Order.js";
import OrderItem from "./OrderItem.js";
import Payment from "./Payment.js";
import Review from "./Review.js";
import Wishlist from "./Wishlist.js";
import WishlistItem from "./WishlistItem.js";
import ProductImage from "./ProductImage.js";
import Category from "./Category.js";
User.hasMany(Address, {
    foreignKey: "userId",
    as: "addresses",
    onDelete: "CASCADE",
});

Address.belongsTo(User, {
    foreignKey: "userId",
    as: "user",
});

User.hasOne(Cart, {
    foreignKey: "userId",
    as: "cart",
    onDelete: "CASCADE",
});

Cart.belongsTo(User, {
    foreignKey: "userId",
    as: "user",
});

Cart.hasMany(CartItem, {
    foreignKey: "cartId",
    as: "items",
    onDelete: "CASCADE",
});

CartItem.belongsTo(Cart, {
    foreignKey: "cartId",
    as: "cart",
});

Product.hasMany(CartItem, {
    foreignKey: "productId",
    as: "cartItems",
    onDelete: "RESTRICT",
});

CartItem.belongsTo(Product, {
    foreignKey: "productId",
    as: "product",
});

User.hasOne(Wishlist, {
    foreignKey: "userId",
    as: "wishlist",
    onDelete: "CASCADE",
});

Wishlist.belongsTo(User, {
    foreignKey: "userId",
    as: "user",
});

Wishlist.hasMany(WishlistItem, {
    foreignKey: "wishlistId",
    as: "items",
    onDelete: "CASCADE",
});

WishlistItem.belongsTo(Wishlist, {
    foreignKey: "wishlistId",
    as: "wishlist",
});

Product.hasMany(WishlistItem, {
    foreignKey: "productId",
    as: "wishlistItems",
    onDelete: "RESTRICT",
});

WishlistItem.belongsTo(Product, {
    foreignKey: "productId",
    as: "product",
});

User.hasMany(Order, {
    foreignKey: "userId",
    as: "orders",
    onDelete: "RESTRICT",
});

Order.belongsTo(User, {
    foreignKey: "userId",
    as: "user",
});

Order.hasMany(OrderItem, {
    foreignKey: "orderId",
    as: "items",
    onDelete: "CASCADE",
});

OrderItem.belongsTo(Order, {
    foreignKey: "orderId",
    as: "order",
});

Product.hasMany(OrderItem, {
    foreignKey: "productId",
    as: "orderItems",
    onDelete: "RESTRICT",
});

OrderItem.belongsTo(Product, {
    foreignKey: "productId",
    as: "product",
});

Order.hasOne(Payment, {
    foreignKey: "orderId",
    as: "payments",
    onDelete: "CASCADE",
});

Payment.belongsTo(Order, {
    foreignKey: "orderId",
    as: "order",
});

User.hasMany(Review, {
    foreignKey: "userId",
    as: "reviews",
    onDelete: "CASCADE",
});

Review.belongsTo(User, {
    foreignKey: "userId",
    as: "user",
});

Product.hasMany(Review, {
    foreignKey: "productId",
    as: "reviews",
    onDelete: "CASCADE",
});

Review.belongsTo(Product, {
    foreignKey: "productId",
    as: "product",
});
db.sync({ alter: true }).then(() => {
    console.log("Database synced");
}).catch((err) => {
    console.log(err);
});
export { User, Address, Product, Cart, CartItem, Order, OrderItem, Payment, Review, Wishlist, WishlistItem, ProductImage, Category };

