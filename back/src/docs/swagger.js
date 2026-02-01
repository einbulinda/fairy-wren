const swaggerJSDoc = require("swagger-jsdoc");

module.exports = swaggerJSDoc({
  definition: {
    openapi: "3.0.3",
    info: {
      title: "Fairy Wren ERP API",
      version: "2.0.0",
      description: "REST API for Fairy Wren ERP & POS",
    },
    servers: [{ url: "/", description: "API v2" }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      responses: {
        BadRequest: {
          description: "Invalid request",
        },
        Unauthorized: {
          description: "Authentication required",
        },
        NotFound: {
          description: "Resource not found",
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ["./src/modules/**/*.docs.js", "./src/modules/**/*.schemas.js"],
});
