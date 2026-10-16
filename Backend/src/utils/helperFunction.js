export const throwError = (message, statusCode) => {
    const error = new Error(message);
    error.cause = statusCode;
    throw error;
};
