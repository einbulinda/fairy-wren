const repo = require("./gallery.repository");
const getSupabase = require("../../config/supabase");
const path = require("path");

const BUCKET = "gallery-images";

exports.list = async ({ activeOnly = false } = {}) => {
  const { data, error, count } = await repo.findAll({ activeOnly });
  if (error) throw new Error("FAILED_TO_FETCH_GALLERY");
  return { images: data, total: count };
};

exports.upload = async (file, { caption, context }) => {
  const supabase = getSupabase();
  const ext = path.extname(file.originalname).toLowerCase() || ".jpg";
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(filename, file.buffer, {
      contentType: file.mimetype,
      upsert: false,
    });

  if (uploadError) {
    console.log("Image Upload Error", uploadError);
    throw new Error("FAILED_TO_UPLOAD_IMAGE");
  }

  const { data: urlData } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(filename);

  const maxOrder = await repo.getMaxSortOrder();

  const { data, error } = await repo.create({
    url: urlData.publicUrl,
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
  // Update sort_order for each id based on array position
  const supabase = getSupabase();
  const updates = orderedIds.map((id, index) =>
    supabase.from("gallery_images").update({ sort_order: index }).eq("id", id),
  );
  await Promise.all(updates);
};

exports.remove = async (id) => {
  const supabase = getSupabase();
  const { data: existing, error: fetchErr } = await repo.findById(id);
  if (fetchErr || !existing) throw new Error("IMAGE_NOT_FOUND");

  // Extract filename from URL and delete from storage
  const filename = existing.url.split("/").pop();
  await supabase.storage.from(BUCKET).remove([filename]);

  const { error } = await repo.remove(id);
  if (error) throw new Error("FAILED_TO_DELETE_IMAGE");
};
