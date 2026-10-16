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
app.listen(port, () => {
    console.log("Server is running on port 3000");
});