import { DataTypes } from "sequelize";
import db from "./connection.js";

const Cart = db.define(
    "Cart",
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        userId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            unique: true, 
            references: {
                model: "users",
                key: "id",
            },
            onDelete: "CASCADE",
        },
        totalCartPrice: {
            type: DataTypes.DECIMAL(10,2),
            allowNull: false,
            defaultValue: 0.0,
        },
    },
    {
        tableName: "carts",
        timestamps: true,
    },
);

export default Cart;
