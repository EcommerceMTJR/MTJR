import { DataTypes } from "sequelize";
import db from "./connection.js";

const WishlistItem = db.define(
    "WishlistItem",
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        wishlistId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: "wishlists",
                key: "id",
            },
            onDelete: "CASCADE",
        },
        productId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: "products",
                key: "id",
            },
            onDelete: "CASCADE",
        },
    },
    {
        tableName: "wishlist_items",
        timestamps: true,
        indexes: [
            {
                unique: true,
                fields: ["wishlistId", "productId"], // منع إضافة المنتج للمفضلة أكثر من مرة
            },
        ],
    },
);

export default WishlistItem;
