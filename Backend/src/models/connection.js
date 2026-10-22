// import { Sequelize } from "sequelize";
// const db = new Sequelize('E_Commerce', 'postgres', 'ahmed@1234', {
//     host: "localhost",
//     port: 5432,
//     dialect: "postgres",
//     logging: false,
// },console.log("Database connected"))
// export default db;
import pg from "pg";
import { Sequelize } from "sequelize";
import dotenv from "dotenv";
dotenv.config();

const db = new Sequelize(process.env.DATABASE_URL, {
    dialect: "postgres",
    dialectModule: pg, // مهم على Vercel
    logging: false,
    dialectOptions: {
        ssl: {
            require: true,
            rejectUnauthorized: false,
        },
    },
    pool: {
        max: 3,
        min: 0,
        idle: 10000,
        acquire: 30000,
    },
});

export default db;