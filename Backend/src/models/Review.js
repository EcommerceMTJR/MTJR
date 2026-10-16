import { DataTypes } from "sequelize";
import db from "./connection.js";

const Review = db.define(
    "Review",
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        comment: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        ratings: {
            type: DataTypes.DECIMAL(2, 1), // التقييم من 1.0 إلى 5.0
            allowNull: false,
            validate: {
                min: 1.0,
                max: 5.0,
            },
        },
        userId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: "users",
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
        tableName: "reviews",
        timestamps: true,
        indexes: [
            {
                unique: true,
                fields: ["userId", "productId"], // يمنع المستخدم من كتابة أكثر من تقييم لنفس المنتج
            },
            { fields: ["productId"] },
        ],
    },
);

export default Review;
