import { DataTypes } from "sequelize";
import db from "./connection.js";

const ProductImage = db.define(
    "ProductImage",
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        imageUrl: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        productId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: "products",
                key: "id",
            },
            onDelete: "CASCADE", // حذف الصور فرعياً عند حذف المنتج
        },
    },
    {
        tableName: "product_images",
        timestamps: true,
        indexes: [{ fields: ["productId"] }],
    },
);

export default ProductImage;
