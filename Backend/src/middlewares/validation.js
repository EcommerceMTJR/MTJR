const validation = (schema) => {
    return (req, res, next) => {
        const inputData = { ...req.body, ...req.params, ...req.query };
        const result = schema.validate(inputData, { abortEarly: false });
        if (result.error) {
            return res.status(400).json({
                success: false,
                message: result.error.message,
                CatchErrorIn: "Validation",
            });
        }
        return next();
    };
};

export default validation;
