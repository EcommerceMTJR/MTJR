
import { DataTypes } from "sequelize";
import db from "./connection.js";

const CartItem = db.define(
    "CartItem",
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        cartId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: "carts",
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
        quantity: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 1,
            validate: { min: 1 },
        },
        price: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
        },
    },
    {
        tableName: "cart_items",
        timestamps: true,
        indexes: [{ fields: ["cartId"] }],
    },
);

export default CartItem;
