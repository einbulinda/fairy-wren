const fs = require("fs");
const path = require("path");
const repo = require("./gallery.repository");
const pool = require("../../config/db");

const UPLOAD_DIR = path.join(__dirname, "../../../uploads/gallery");

function ensureUploadDir() {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
}

function buildPublicUrl(filename) {
  const base = (process.env.BASE_URL || "http://localhost:8000").replace(/\/$/, "");
  return `${base}/uploads/gallery/${filename}`;
}

exports.list = async ({ activeOnly = false } = {}) => {
  const { data, error, count } = await repo.findAll({ activeOnly });
  if (error) throw new Error("FAILED_TO_FETCH_GALLERY");
  return { images: data, total: count };
};

exports.upload = async (file, { caption, context }) => {
  ensureUploadDir();

  const ext = path.extname(file.originalname).toLowerCase() || ".jpg";
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
  const filePath = path.join(UPLOAD_DIR, filename);

  fs.writeFileSync(filePath, file.buffer);

  const publicUrl = buildPublicUrl(filename);
  const maxOrder = await repo.getMaxSortOrder();

  const { data, error } = await repo.create({
    url: publicUrl,
    caption: caption || null,
    sort_order: maxOrder + 1,
    active: true,
    uploaded_by: context.userId,
  });

  if (error) throw new Error("FAILED_TO_SAVE_IMAGE");
  return data;
};

exports.update = async (id, { caption, active, sort_order }) => {
  const { data: existing, error: fetchErr } = await repo.findById(id);
  if (fetchErr || !existing) throw new Error("IMAGE_NOT_FOUND");

  const updates = {};
  if (caption !== undefined) updates.caption = caption;
  if (active !== undefined) updates.active = active;
  if (sort_order !== undefined) updates.sort_order = sort_order;

  const { data, error } = await repo.update(id, updates);
  if (error) throw new Error("FAILED_TO_UPDATE_IMAGE");
  return data;
};

exports.reorder = async (orderedIds) => {
  await Promise.all(
    orderedIds.map((id, index) =>
      pool.query("UPDATE gallery_images SET sort_order = $1 WHERE id = $2", [index, id])
    )
  );
};

exports.remove = async (id) => {
  const { data: existing, error: fetchErr } = await repo.findById(id);
  if (fetchErr || !existing) throw new Error("IMAGE_NOT_FOUND");

  // Delete local file if stored locally
  if (existing.url && existing.url.includes("/uploads/gallery/")) {
    const filename = existing.url.split("/uploads/gallery/").pop();
    const filePath = path.join(UPLOAD_DIR, filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  const { error } = await repo.remove(id);
  if (error) throw new Error("FAILED_TO_DELETE_IMAGE");
};
