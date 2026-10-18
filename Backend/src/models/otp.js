import db from "./connection.js";
 const Otp = db.define("Otp", {
    id: {
        type: db.Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    email: {
        type: db.Sequelize.STRING,
        allowNull: false,
    },
    otp: {
        type: db.Sequelize.STRING,
        allowNull: false,
    },
    expiredAt: {
        type: db.Sequelize.DATE,
        allowNull: false,
    },
 });
export default Otp;