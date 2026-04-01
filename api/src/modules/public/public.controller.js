const eventsService = require("../events/events.service");
const feedbackService = require("../feedback/feedback.service");
const galleryService = require("../gallery/gallery.service");
const reservationsService = require("../reservations/reservations.service");

exports.getEvents = async (req, res, next) => {
  try {
    const data = await eventsService.getPublished();
    res.json(data);
  } catch (err) {
    next(err);
  }
};

exports.getGallery = async (req, res, next) => {
  try {
    const data = await galleryService.list({ activeOnly: true });
    res.json(data);
  } catch (err) {
    next(err);
  }
};

exports.submitFeedback = async (req, res, next) => {
  try {
    const data = await feedbackService.submit(req.body);
    res.status(201).json({ message: "Thank you for your feedback!", id: data.id });
  } catch (err) {
    next(err);
  }
};

exports.submitReservation = async (req, res, next) => {
  try {
    const data = await reservationsService.submit(req.body);
    res.status(201).json({ message: "Reservation submitted! We'll be in touch shortly.", id: data.id });
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
