import { DataTypes } from "sequelize";
import db from "./connection.js";

const OrderItem = db.define(
    "OrderItem",
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        orderId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: "orders",
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
            onDelete: "RESTRICT",
        },
        quantity: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        price: {
            type: DataTypes.DECIMAL(10, 2), // حفظ سعر المنتج الأصلي وقت الشراء لتجنب التأثر بتغيرات السعر المستقبلية
            allowNull: false,
        },
    },
    {
        tableName: "order_items",
        timestamps: true,
        indexes: [{ fields: ["orderId"] }],
    },
);

export default OrderItem;
