import { DataTypes } from "sequelize";
import db from "./connection.js";

export const orderStatuses = {
    pending: "pending",
    processing: "processing",
    shipped: "shipped",
    delivered: "delivered",
    cancelled: "cancelled",
};

export const paymentMethods = {
    cash: "cash",
    card: "card",
};

const Order = db.define(
    "Order",
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        userId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: "users",
                key: "id",
            },
            onDelete: "RESTRICT", // الحفاظ على تاريخ الطلبات حتى لو حُذف المستخدم
        },
        addressId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: "addresses",
                key: "id",
            },
            onDelete: "RESTRICT",
        },
        shippingPrice: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
            defaultValue: 0.0,
        },
        totalOrderPrice: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
        },
        paymentMethod: {
            type: DataTypes.ENUM(...Object.values(paymentMethods)),
            allowNull: false,
            defaultValue: paymentMethods.cash,
        },
        isPaid: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
        paidAt: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        status: {
            type: DataTypes.ENUM(...Object.values(orderStatuses)),
            allowNull: false,
            defaultValue: orderStatuses.pending,
        },
        deliveredAt: {
            type: DataTypes.DATE,
            allowNull: true,
        },
    },
    {
        tableName: "orders",
        timestamps: true,
        indexes: [{ fields: ["userId"] }, { fields: ["status"] }],
    },
);

export default Order;
