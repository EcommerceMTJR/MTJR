import { DataTypes } from "sequelize";
import db from "./connection.js"

const Product = db.define(
    "Product",
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        title: {
            type: DataTypes.STRING(200),
            allowNull: false,
        },
        slug: {
            type: DataTypes.STRING(220),
            allowNull: false,
            unique: true,
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
        price: {
            type: DataTypes.DECIMAL(10, 2), // سعر حتى 99 مليون وبدقة قرشين
            allowNull: false,
            validate: {
                min: 0,
            },
        },
        discountPrice: {
            type: DataTypes.DECIMAL(10, 2), // السعر بعد الخصم إن وجد
            allowNull: true,
            validate: {
                min: 0,
            },
        },
        stock: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
            validate: {
                min: 0,
            },
        },
        soldCount: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0, 
        },
        coverImage: {
            type: DataTypes.STRING,
            allowNull: false, 
        },
        ratingsAverage: {
            type: DataTypes.DECIMAL(2, 1), // متوسط التقييم (مثلاً 4.5)
            allowNull: false,
            defaultValue: 0.0,
        },
        ratingsQuantity: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0, // عدد التقييمات
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
        },
        categoryId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: "categories",
                key: "id",
            },
            onDelete: "RESTRICT", // منع حذف القسم إذا كان يضم منتجات
        },
    },
    {
        tableName: "products",
        timestamps: true,
        indexes: [
            { fields: ["slug"] },
            { fields: ["categoryId"] },
            { fields: ["price"] },
        ],
    }
);

export default Product;