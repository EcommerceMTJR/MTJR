import db from "../../models/connection.js";

import jwt from "jsonwebtoken";
import asyncHandler from "../../middlewares/asyncHandler.js";
import crypto from "crypto-js";
import bcrypt from "bcrypt";
import { throwError } from "../../utils/helperFunction.js";
import User from "../../models/user.model.js";
import { sendGmaiWithToken } from "../../utils/sendEmail.js";
export const register = asyncHandler(async (req, res, next) => {
    const { firstName, lastName, email, confirmedPassword, password, phone, age, gender } = req.body;
    const user = await User.findOne({ where: { email } });
    if (user) {
        return res.status(400).json({ success: false, message: "User already exists" });
    }
    const hasPassword = bcrypt.hashSync(password, 10);
    const encryptPhone = crypto.AES.encrypt(phone, process.env.ecryptphone_key).toString();
    const sendEmail = await sendGmaiWithToken(email, `${firstName}${lastName}`);
    if (!sendEmail) {
        throwError("sendEmailError", 400);
    }
    const createUser = await User.create({ firstName, lastName, email, password: hasPassword, phone: encryptPhone });
    if (!createUser) {
        throwError("Error in creatUser", 400);
    }
    res.json({ success: true, message: "register Successfully", createUser });
});
export const activeToken = asyncHandler(async (req, res, next) => {
    const { token } = req.params;
    const { email } = jwt.verify(token, process.env.key_Token_Secret);
    const user = await User.findOne({ where: { email } });
    if (!user) {
        throwError("User not Found", 404);
    }
    user.isVerified = true;
    await user.save();
    res.json({ success: true, message: "Active Successfully" });
});

export const login = asyncHandler(async (req, res, next) => {
    const { email, password } = req.body;
    const user = await User.findOne({ where: { email } });
    if (!user) {
        throwError("Invalid email or password", 404);
    }
    const checkPassword = await bcrypt.compare(password, user.password);
    if (!checkPassword) {
        throwError("Invalid email or password", 404);
    }
    if (!user.isVerified) {
        throwError("Please verify your email first", 400);
    }
    const token = jwt.sign({ id: user.id, email }, process.env.token_login, { expiresIn: "5d" });
    res.status(200).json({ message: "Login Successfully", token });
});
