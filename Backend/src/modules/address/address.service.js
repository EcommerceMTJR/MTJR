import asyncHandler from "../../middlewares/asyncHandler.js";
import { throwError } from "../../utils/helperFunction.js";
import { pick, parseId, handleDbError } from "../../utils/common.js";
import Address from "../../models/address.model.js";

// الحقول اللي اليوزر يقدر يبعتها (postaCode بنفس إملاء الموديل عندك)
const FIELDS = ["country", "city", "postaCode", "phone"];
const MAX_ADDRESSES = 10;

export const getAddresses = asyncHandler(async (req, res) => {
    const addresses = await Address.findAll({
        where: { userId: req.user.id },
        order: [["createdAt", "DESC"]],
    });
    res.status(200).json({ success: true, result: addresses });
});

export const createAddress = asyncHandler(async (req, res) => {
    const data = pick(req.body, FIELDS);
    if (!data.city) throwError("city is required", 400);

    const count = await Address.count({ where: { userId: req.user.id } });
    if (count >= MAX_ADDRESSES) throwError(`You can save up to ${MAX_ADDRESSES} addresses`, 400);

    try {
        const address = await Address.create({ ...data, userId: req.user.id });
        res.status(201).json({ success: true, message: "Address added", result: address });
    } catch (err) {
        handleDbError(err);
    }
});

export const updateAddress = asyncHandler(async (req, res) => {
    // لازم العنوان يكون بتاع اليوزر نفسه
    const address = await Address.findOne({ where: { id: parseId(req.params.id), userId: req.user.id } });
    if (!address) throwError("Address not found", 404);

    const data = pick(req.body, FIELDS);
    if (Object.keys(data).length === 0) throwError("Nothing to update", 400);
    if (data.city !== undefined && !data.city) throwError("city cannot be empty", 400);

    try {
        await address.update(data);
        res.status(200).json({ success: true, message: "Address updated", result: address });
    } catch (err) {
        handleDbError(err);
    }
});

export const deleteAddress = asyncHandler(async (req, res) => {
    const address = await Address.findOne({ where: { id: parseId(req.params.id), userId: req.user.id } });
    if (!address) throwError("Address not found", 404);

    try {
        await address.destroy();
    } catch (err) {
        if (err.name === "SequelizeForeignKeyConstraintError") {
            throwError("This address is used by an existing order and cannot be deleted", 409);
        }
        throw err;
    }
    res.status(200).json({ success: true, message: "Address deleted" });
});
