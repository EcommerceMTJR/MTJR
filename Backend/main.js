import dotenv from "dotenv"
dotenv.config()
import express from "express";
import { bootstrap } from "./app.controller.js";
import cors from "cors";

const app = express();
const port = 3000;

app.use(cors({
    origin: ["http://localhost:5173"],
}))
app.get("/", (req, res) => {
    res.send("server is running");
});
bootstrap(express,app);


if (process.env.NODE_ENV !== "production") {
    app.listen(process.env.PORT || 3000, () => {
        console.log("Server is running locally...");
    });
}

export default app;