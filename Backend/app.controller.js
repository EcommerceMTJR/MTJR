import dotenv from "dotenv";
import db from "./src/models/connection.js";
import authRouter from "./src/modules/auth/auth.controller.js";
import { User, Address, Product, Cart, CartItem, Order, OrderItem, Payment, Review, Wishlist, WishlistItem } from "./src/models/relation.js";
export const bootstrap =async (express, app) => {
    dotenv.config();
    app.use(express.json());
    db;
    await db.sync({ alter: true })
        .then(() => {
            console.log("Database synced");
        })
        .catch((err) => {
            console.log(err);
        });
    app.use("/auth", authRouter);

    app.use("/", (req, res, next) => {
        return res.status(500).json({ success: false, message: "route not Found" });
    });

    app.use((err, req, res, next) => {
        const statusCode = err.cause || err.statusCode || 500;
        res.status(statusCode).json({ success: false, message: err.message || "Internal Server Error", stack: err.stack });
    });
};
