import jwt from "jsonwebtoken"
import { verifyEmailTemplate } from "./templeteHtml.js";
import dotenv from "dotenv"
dotenv.config()
import nodemailer from "nodemailer";
const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
        user: process.env.nodeMailer_userGmail,
        pass: process.env.nodeMailer_passApp,
    },
});
export const sendGmaiWithToken = (email,userName) => {
    const token = jwt.sign({ email }, process.env.key_Token_Secret)
    const link = `http://localhost:3000/auth/activate/${token}`;
    const sender= transporter.sendMail({
        from: process.env.nodeMailer_userGmail,
        to: email,
        subject: `Verify Email , تفعيل حسابك`,
        html:verifyEmailTemplate(email,userName,link)
    })
    return sender
}