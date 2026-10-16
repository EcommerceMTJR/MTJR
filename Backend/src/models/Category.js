import { DataTypes } from "sequelize";
import db from "./connection.js";

const Category = db.define(
    "Category",
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        name: {
            type: DataTypes.STRING(100),
            allowNull: false,
            unique: true, 
        },
        slug: {
            type: DataTypes.STRING(120),
            allowNull: false,
            unique: true, 
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        image: {
            type: DataTypes.STRING,
            allowNull: true, 
        },
        parentId: {
            type: DataTypes.INTEGER,
            allowNull: true, // إذا كان null فهو قسم رئيسي، وإذا احتوى على id فهو قسم فرعي
            references: {
                model: "categories",
                key: "id",
            },
            onDelete: "SET NULL",
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true, 
        },
    },
    {
        tableName: "categories",
        timestamps: true,
        indexes: [{ fields: ["slug"] }, { fields: ["parentId"] }],
    },
);

export default Category;
