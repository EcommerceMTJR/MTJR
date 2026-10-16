import { DataTypes } from "sequelize";
import db from "./connection.js";
const Address = db.define(
    "Address",
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
            onDelete: "CASCADE", 
        },

        country: {
            type: DataTypes.STRING(100),
            allowNull: false,
            defaultValue: "Egypt", 
        },
        city: {
            type: DataTypes.STRING(100), 
            allowNull: false,
        },

        postaCode: {
            type: DataTypes.STRING(20), 
            allowNull: true,
        },

        phone: {
            type: DataTypes.STRING(20), 
            allowNull: true,
        },
    },
    {
        tableName: "addresses",
        timestamps: true,
        indexes: [
            {
                fields: ["userId"],
            },
        ],
    },
);

export default Address;
