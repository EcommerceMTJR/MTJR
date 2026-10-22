// import { Sequelize } from "sequelize";
// const db = new Sequelize('E_Commerce', 'postgres', 'ahmed@1234', {
//     host: "localhost",
//     port: 5432,
//     dialect: "postgres",
//     logging: false,
// },console.log("Database connected"))
// export default db;

import { Sequelize } from "sequelize";
import dotenv from "dotenv";
dotenv.config();
const db = new Sequelize(process.env.DATABASE_URL, {
  dialect: "postgres",
  logging: false,
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false,
    },
  },
});

console.log("Database connected");

export default db;