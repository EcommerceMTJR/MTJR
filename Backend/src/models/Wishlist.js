import { DataTypes } from "sequelize";
import db from "./connection.js";

const Wishlist = db.define(
    "Wishlist",
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        userId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            unique: true, // قائمة مفضلة واحدة لكل مستخدم
            references: {
                model: "users",
                key: "id",
            },
            onDelete: "CASCADE",
        },
    },
    {
        tableName: "wishlists",
        timestamps: true,
    },
);

export default Wishlist;
