const eventsService = require("../events/events.service");
const feedbackService = require("../feedback/feedback.service");
const galleryService = require("../gallery/gallery.service");

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
