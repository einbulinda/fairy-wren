const pool = require("../../config/db");
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

exports.getMenu = async (req, res, next) => {
  try {
    const { rows } = await pool.query(`
      SELECT p.id, p.name, p.price, p.unit, p.image_url,
             c.id AS category_id, c.name AS category_name
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      WHERE p.active = true
      ORDER BY c.name NULLS LAST, p.name
    `);

    const catMap = new Map();
    for (const row of rows) {
      const key = row.category_id || "__none__";
      if (!catMap.has(key)) catMap.set(key, { id: key, name: row.category_name || "Other", products: [] });
      catMap.get(key).products.push({
        id: row.id, name: row.name, price: Number(row.price), unit: row.unit, image_url: row.image_url || null,
      });
    }

    res.json({ categories: [...catMap.values()] });
  } catch (err) { next(err); }
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
