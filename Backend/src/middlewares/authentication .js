
import User from "../models/user.model.js";
import jwt from "jsonwebtoken";
import asyncHandler from "./asyncHandler.js";
export const authentication = asyncHandler(async (req, res, next) => {
    const { tokenheader } = req.headers;
    if (!tokenheader || !tokenheader.startsWith("Bearer ")) {
        return res.status(401).json({ success: false, message: "token not found" });
    }
    const token = tokenheader.split(" ")[1];
    const { id } = jwt.verify(token, process.env.jwt_secret_key);
    const user = await User.findById(id).select("-password");
    if (!user) {
        return res.status(404).json({ success: false, message: "user not Found" });
    }
    req.user = user;
    next();
});
