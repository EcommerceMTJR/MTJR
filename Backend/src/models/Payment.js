import { DataTypes } from "sequelize";
import db from "./connection.js";

export const paymentStatuses = {
    pending: "pending",
    completed: "completed",
    failed: "failed",
    refunded: "refunded",
};

const Payment = db.define(
    "Payment",
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        orderId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            unique: true, // معاملة دفع واحدة لكل طلب
            references: {
                model: "orders",
                key: "id",
            },
            onDelete: "CASCADE",
        },
        transactionId: {
            type: DataTypes.STRING, // معرف المعاملة المرتجع من بوابة الدفع (Paymob / Stripe ID)
            allowNull: true,
        },
        amount: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
        },
        provider: {
            type: DataTypes.STRING(50), // اسم بوابة الدفع (e.g., Paymob, Stripe, COD)
            allowNull: false,
        },
        status: {
            type: DataTypes.ENUM(...Object.values(paymentStatuses)),
            allowNull: false,
            defaultValue: paymentStatuses.pending,
        },
    },
    {
        tableName: "payments",
        timestamps: true,
        indexes: [{ fields: ["orderId"] }],
    },
);

export default Payment;
