export const authorization = (...roles) => {
    return (req, res, next) => {
        console.log("Logged User Role:", req.user?.role);
        console.log("Allowed Roles:", roles);
        if (!req.user || !roles.includes(req.user.role)) {
            return next(new Error("You are not authorized to access this route", { cause: 403 }));
        }
        return next();
    };
};

