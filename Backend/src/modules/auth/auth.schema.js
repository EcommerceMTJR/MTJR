
import joi from "joi"
export const registerSchema = joi
    .object(
        {
            firstName: joi.string().min(3).max(15).required(),
            lastName: joi.string().min(3).max(15).required(),
            email: joi.string().email().required(),
            password: joi.string().min(6).max(20).required(),
            confirmedPassword: joi.valid(joi.ref("password")).required(),
            phone: joi.string().min(11).max(12).required(),
            age: joi.number().min(18).required(),
            gender: joi.string().valid("male", "female").required(),
        }
    )
    .required();
export const loginSchema = joi.object({
    email: joi.string().email().required(),
    password:joi.string().min(6).max(20).required()
    }).required()
