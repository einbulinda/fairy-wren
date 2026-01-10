export const mapErrorToHttp = (err) => {
  if (!err) {
    return { status: 500, body: { message: "Unknown error" } };
  }

  switch (err.name) {
    case "ValidationError":
      return {
        status: 400,
        body: { message: err.message, details: err.details },
      };

    case "NotFoundError":
      return {
        status: 404,
        body: { message: err.message },
      };

    case "BusinessError":
      return {
        status: 409,
        body: { message: err.message },
      };

    case "AuthError":
      return {
        status: err.status || 401,
        body: { message: err.message },
      };

    default:
      return {
        status: 500,
        body: { message: "Internal server error" },
      };
  }
};
