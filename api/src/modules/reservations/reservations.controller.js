const service = require("./reservations.service");

exports.list = async (req, res, next) => {
  try {
    const { status, date, limit, offset } = req.query;
    const result = await service.list({
      status: status || undefined,
      date: date || undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
};

exports.updateStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!status) return res.status(400).json({ message: "Status is required" });
    const data = await service.updateStatus(id, status);
    res.json(data);
  } catch (err) {
    if (err.message === "RESERVATION_NOT_FOUND") {
      return res.status(404).json({ message: "Reservation not found" });
    }
    next(err);
  }
};

exports.submit = async (req, res, next) => {
  try {
    const data = await service.submit(req.body);
    res.status(201).json({ message: "Reservation submitted successfully!", id: data.id });
  } catch (err) {
    const clientErrors = {
      RESERVATION_NAME_REQUIRED: "Name is required",
      RESERVATION_DATE_REQUIRED: "Reservation date is required",
      RESERVATION_PARTY_SIZE_REQUIRED: "Party size must be at least 1",
      RESERVATION_CONTACT_REQUIRED: "A phone number or email is required",
    };
    if (clientErrors[err.message]) {
      return res.status(400).json({ message: clientErrors[err.message] });
    }
    next(err);
  }
};
