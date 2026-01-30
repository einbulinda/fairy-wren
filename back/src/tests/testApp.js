const express = require("express");
const productRoutes = require("../modules/products/products.routes");
const requestContext = require("../middleware/requestContext");

const app = express();

app.use(requestContext);
app.use(express.json());

// Mock Auth
app.use((req, res, next) => {
  req.user = { id: "test-user" };
  next();
});

app.use("/products", productRoutes);

// minimal error handler
app.use((err, req, res, next) => {
  res.status(500).json({
    success: false,
    error: { code: err.message },
  });
});

module.exports = app;
