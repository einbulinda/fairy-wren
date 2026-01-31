const express = require("express");
const productRoutes = require("../modules/products/products.routes");
const usersRoutes = require("../modules/users/users.routes");
const authRoutes = require("../modules/auth/auth.routes");
const requestContext = require("../middleware/requestContext");
const errorHandler = require("../middleware/errorHandler");

const app = express();

app.use(requestContext);
app.use(express.json());

// Mock Auth
app.use((req, res, next) => {
  if (req.headers.authorization === "Bearer test-token") {
    req.user = { id: "test-user", role: "owner", name: "John" };
  }
  next();
});

app.use("/products", productRoutes);
app.use("/users", usersRoutes);
app.use("/auth", authRoutes);

// minimal error handler
app.use(errorHandler);

module.exports = app;
