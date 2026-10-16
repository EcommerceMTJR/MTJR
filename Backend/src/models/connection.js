import { Sequelize } from "sequelize";
const db = new Sequelize('E_Commerce', 'postgres', 'ahmed@1234', {
    host: "localhost",
    port: 5432,
    dialect: "postgres",
    logging: false,
},console.log("Database connected"))
export default db;