import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
import swaggerJsdoc from "swagger-jsdoc";

export default swaggerJsdoc({
    definition: {
        openapi: "3.0.0",
        info: { title: "MTJR API", version: "1.0.0" },
        components: {
            securitySchemes: {
                tokenAuth: {
                    type: "apiKey",
                    in: "header",
                    name: "tokenheader",
                    description: "اكتب: Bearer <token> (بالكلمة Bearer ومسافة)",
                },
            },
            parameters: {
                IdParam: { in: "path", name: "id", required: true, schema: { type: "integer", minimum: 1 } },
                Page: { in: "query", name: "page", schema: { type: "integer", default: 1, minimum: 1 } },
                Limit: { in: "query", name: "limit", schema: { type: "integer", default: 20, minimum: 1, maximum: 100 } },
            },
            responses: {
                Unauthorized: { description: "التوكن غير موجود أو غير صالح" },
                Forbidden: { description: "ممنوع: للأدمن فقط" },
                NotFound: { description: "غير موجود" },
            },
            schemas: {
                Product: {
                    type: "object",
                    properties: {
                        id: { type: "integer", example: 1 },
                        title: { type: "string", example: "iPhone 15" },
                        slug: { type: "string", example: "iphone-15" },
                        price: { type: "number", example: 1000 },
                        discountPrice: { type: "number", nullable: true, example: 850 },
                        stock: { type: "integer", example: 10 },
                        categoryId: { type: "integer", example: 2 },
                        soldCount: { type: "integer", example: 25 },
                        ratingsAverage: { type: "number", example: 4.5 },
                        ratingsQuantity: { type: "integer", example: 12 },
                        isActive: { type: "boolean", example: true },
                        createdAt: { type: "string", format: "date-time" },
                        finalPrice: { type: "number", example: 850 },
                        discountPercent: { type: "integer", example: 15 },
                        inStock: { type: "boolean", example: true },
                    },
                },
                Category: {
                    type: "object",
                    properties: {
                        id: { type: "integer", example: 1 },
                        name: { type: "string", example: "Phones" },
                        slug: { type: "string", example: "phones" },
                        parentId: { type: "integer", nullable: true },
                        isActive: { type: "boolean", example: true },
                        children: {
                            type: "array",
                            items: { $ref: "#/components/schemas/Category" },
                        },
                    },
                },
                Pagination: {
                    type: "object",
                    properties: {
                        page: { type: "integer", example: 1 },
                        limit: { type: "integer", example: 20 },
                        total: { type: "integer", example: 100 },
                        totalPages: { type: "integer", example: 5 },
                    },
                },
                Order: {
                    type: "object",
                    properties: {
                        id: { type: "integer", example: 15 },
                        userId: { type: "integer", example: 3 },
                        addressId: { type: "integer", example: 1 },
                        shippingPrice: { type: "number", example: 50 },
                        totalOrderPrice: { type: "number", example: 1750 },
                        paymentMethod: { type: "string", example: "card" },
                        status: { type: "string", example: "processing" },
                        isPaid: { type: "boolean", example: true },
                        paidAt: { type: "string", format: "date-time", nullable: true },
                        deliveredAt: { type: "string", format: "date-time", nullable: true },
                        createdAt: { type: "string", format: "date-time" },
                    },
                },
                User: {
                    type: "object",
                    properties: {
                        id: { type: "integer", example: 3 },
                        firstName: { type: "string", example: "Ahmed" },
                        lastName: { type: "string", example: "Ali" },
                        email: { type: "string", example: "ahmed@mail.com" },
                        role: { type: "string", example: "user" },
                        isActive: { type: "boolean", example: true },
                        createdAt: { type: "string", format: "date-time" },
                    },
                },
                ProductInput: {
                    type: "object",
                    properties: {
                        title: { type: "string", example: "iPhone 15" },
                        slug: { type: "string", example: "iphone-15", description: "اختياري، بيتولد تلقائيًا" },
                        description: { type: "string" },
                        price: { type: "number", example: 1000 },
                        discountPrice: { type: "number", nullable: true, example: 850, description: "لازم أقل من price" },
                        stock: { type: "integer", example: 10 },
                        coverImage: { type: "string", example: "https://..." },
                        isActive: { type: "boolean", example: true },
                        categoryId: { type: "integer", example: 2 },
                    },
                },
                CategoryInput: {
                    type: "object",
                    properties: {
                        name: { type: "string", example: "Phones" },
                        slug: { type: "string", description: "اختياري، بيتولد تلقائيًا" },
                        description: { type: "string" },
                        image: { type: "string" },
                        parentId: { type: "integer", nullable: true },
                        isActive: { type: "boolean", example: true },
                    },
                },
            },
        },
    },
    apis: [path.join(__dirname, "src/modules/**/*.js").replace(/\\/g, "/")],
});
