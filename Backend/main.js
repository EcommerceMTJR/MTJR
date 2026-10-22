import dotenv from "dotenv"
dotenv.config()
import express from "express";
import { bootstrap } from "./app.controller.js";

const app = express();
const port = 3000;
bootstrap(express,app);

app.get("/", (req, res) => {
    res.send("server is running");
});
if (process.env.NODE_ENV !== "production") {
    app.listen(process.env.PORT || 3000, () => {
        console.log("Server is running locally...");
    });
}

export default app;