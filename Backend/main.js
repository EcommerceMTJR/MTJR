import dotenv from "dotenv";
dotenv.config();
import express from "express";
import swaggerUi from "swagger-ui-express";
import specs from "../Backend/swagger.js";
import { bootstrap } from "./app.controller.js";
import cors from "cors";

const app = express();

app.use(cors({ origin: ["http://localhost:5173"] }));

app.get("/", (req, res) => {
    res.send("server is running");
});

const CDN = "https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.17.14";
app.use(
    "/api-docs",
    swaggerUi.serve,
    swaggerUi.setup(specs, {
        customCssUrl: `${CDN}/swagger-ui.min.css`,
        customJs: [`${CDN}/swagger-ui-bundle.min.js`, `${CDN}/swagger-ui-standalone-preset.min.js`],
    }),
);

bootstrap(express, app);

if (process.env.NODE_ENV !== "production") {
    app.listen(process.env.PORT || 3000, () => {
        console.log("Server is running locally...");
    });
}

export default app;
