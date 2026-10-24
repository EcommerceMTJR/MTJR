
import db from "./src/models/connection.js";
import authRouter from "./src/modules/auth/auth.controller.js";

import cors from "cors";


const corsOptions = {
    origin: [
        "http://localhost:5173"],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "tokenheader", "Authorization"],
};
let dbReady = null;
const initDb = () => {
    if (!dbReady) {
        dbReady = db
            .sync({ alter: true })
            .then(() => console.log("Database synced"))
            .catch((err) => {
                dbReady = null; // يحاول تاني في الطلب الجاي
                console.error(err);
                throw err;
            });
    }
    return dbReady;
};

export const bootstrap = (express, app) => {
    app.use(cors(corsOptions));
    app.use(express.json());
    db.authenticate()
        .then(() => console.log("Database connected"))
        .catch((err) => console.error("DB connection failed:", err.message));
    // أي request يستنى الداتابيز تجهز (مرة واحدة بس)
    app.use(async (req, res, next) => {
        try {
            await initDb();
            next();
        } catch (err) {
            next(err);
        }
    });
    app.use("/auth", authRouter);
    // 404 handler
    app.use((req, res) => {
        res.status(404).json({ success: false, message: "route not Found" });
    });
    // error handler
    app.use((err, req, res, next) => {
        const statusCode = err.cause || err.statusCode || 500;
        res.status(statusCode).json({
            success: false,
            message: err.message || "Internal Server Error",
        });
    });
};
